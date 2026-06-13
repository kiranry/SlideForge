"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { LoadingOverlay } from "@/components/ui/spinner";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/file-upload";
import { DataPreview } from "@/components/data-preview";
import { CustomThemePicker } from "@/components/custom-theme-picker";
import { LogoUpload } from "@/components/logo-upload";
import { useBuilderStore } from "@/lib/store";
import { saveDeck } from "@/lib/storage";
import { insertInsightSlides } from "@/lib/insights";
import { detectAnomalies } from "@/lib/anomalies";
import { CompetitorDeckUpload } from "@/components/competitor-deck-upload";
import { BrandKitPicker } from "@/components/brand-kit-picker";
import { THEMES, CUSTOM_THEME_ID, withHash } from "@/lib/themes";
import {
  TONE_OPTIONS,
  AUDIENCE_OPTIONS,
  SLIDE_COUNT_PRESETS,
  LANGUAGE_OPTIONS,
} from "@/lib/options";
import { withTiming } from "@/lib/telemetry";
import { enrichManifestWithAutoImages } from "@/lib/deck-auto-images";
import { useBusyPhase } from "@/lib/use-instant-pending";
import type { InputMode, ParsedData, SlideManifest } from "@/lib/types";

const MAX_CHARS = 2000;

function resolveMode(
  mode: InputMode,
  hasDescription: boolean,
  hasData: boolean
): InputMode {
  if (mode === "combined") return "combined";
  if (mode === "data") return "data";
  if (hasData && hasDescription) return "combined";
  if (hasData) return "data";
  return "description";
}

export function BuilderForm() {
  const router = useRouter();
  const store = useBuilderStore();
  const [customCount, setCustomCount] = useState(false);
  const [statusLabel, setStatusLabel] = useState("Generating deck…");
  const { busy, start, redirect, reset } = useBusyPhase();

  const hasDescription = store.description.trim().length > 0;
  const hasData = !!store.parsedData && store.parsedData.sheets.length > 0;

  const generate = useMutation({
    onMutate: () => {
      start();
      setStatusLabel("Preparing…");
    },
    mutationFn: async (): Promise<{ id: string }> => {
      return withTiming("generate.outline", async () => {
      setStatusLabel("Outlining slides…");
      const res = await fetch("/api/generate-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: store.description,
          slideCount: store.slideCount,
          tone: store.tone,
          audience: store.audience,
          theme: store.themeId,
          language: store.language,
          data: store.parsedData,
          recommendations: store.chartRecommendations,
          structureSkeleton: store.structureSkeleton,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Generation failed");
      }
      let { manifest } = (await res.json()) as { manifest: SlideManifest };

      let deckData: ParsedData | null | undefined = store.parsedData;
      const hasChartSlides = manifest.slides.some((s) => s.type === "chart");

      if (
        !deckData?.sheets.length &&
        hasChartSlides &&
        store.autoGenerateChartData
      ) {
        setStatusLabel("Creating chart data…");
        try {
          const dataRes = await fetch("/api/generate-synthetic-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: store.description,
              manifest,
            }),
          });
          if (dataRes.ok) {
            const { data } = (await dataRes.json()) as { data: ParsedData };
            if (data?.sheets?.length) deckData = data;
          }
        } catch {
          /* non-fatal */
        }
      }

      if (store.autoGenerateImages) {
        setStatusLabel("Adding visuals…");
        manifest = await enrichManifestWithAutoImages(
          manifest,
          store.description,
          (msg) => setStatusLabel(msg)
        );
      }

      // Auto-insert data insight slides when a file was uploaded.
      if (deckData && deckData.sheets.length > 0) {
        setStatusLabel("Analyzing data…");
        try {
          const insightRes = await fetch("/api/generate-insights", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: deckData }),
          });
          if (insightRes.ok) {
            const { insights } = (await insightRes.json()) as { insights: string[] };
            if (insights?.length) manifest = insertInsightSlides(manifest, insights);
          }
        } catch {
          /* non-fatal — deck still usable without insights */
        }
      }

      const id = uuidv4();
      const mode = resolveMode(store.mode, hasDescription, hasData);
      const anomalyFlags = deckData ? detectAnomalies(deckData) : undefined;
      store.setManifest(manifest);
      setStatusLabel("Saving deck…");
      await saveDeck({
        id,
        createdAt: new Date().toISOString(),
        mode,
        manifest,
        data: deckData,
        customTheme:
          store.themeId === CUSTOM_THEME_ID ? store.customTheme : undefined,
        logoDataUrl: store.logoDataUrl,
        logoOnAllSlides: store.logoOnAllSlides,
        brandKitId: store.brandKitId,
        headingFont: store.headingFont,
        bodyFont: store.bodyFont,
        chartColors: store.chartColors,
        anomalyFlags,
        suppressedAnomalyIds: [],
        structureSkeleton: store.structureSkeleton,
      });
      return { id };
      });
    },
    onSuccess: ({ id }) => {
      setStatusLabel("Opening preview…");
      redirect();
      router.push(`/preview/${id}`);
    },
    onError: (err: Error) => {
      reset();
      setStatusLabel("Generating deck…");
      toast.error(err.message);
    },
  });

  const startGenerate = () => {
    generate.mutate();
  };

  const canGenerate =
    !busy &&
    !generate.isPending &&
    ((store.mode === "description" && hasDescription) ||
      (store.mode === "data" && hasData) ||
      (store.mode === "combined" && (hasDescription || hasData)));

  const descriptionRequired = store.mode === "description" || store.mode === "combined";
  const dataRequired = store.mode === "data";

  return (
    <>
      <LoadingOverlay open={busy} label={statusLabel} />
      <div
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
        aria-hidden={busy}
        inert={busy ? true : undefined}
      >
      <div className="space-y-4">
        <Tabs
          value={store.mode}
          onValueChange={(v) => store.setMode(v as InputMode)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="description" className="flex-1">
              Describe
            </TabsTrigger>
            <TabsTrigger value="data" className="flex-1">
              Data file
            </TabsTrigger>
            <TabsTrigger value="combined" className="flex-1">
              Combined
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <DescriptionField required />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <Label className="text-base">Upload data</Label>
                <p className="mb-3 mt-1 text-sm text-muted-foreground">
                  Excel, CSV, or PDF. We detect columns and suggest charts.
                </p>
                <FileUpload />
              </CardContent>
            </Card>
            <DataPreview />
          </TabsContent>

          <TabsContent value="combined" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <DescriptionField />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Label className="text-base">Upload data</Label>
                <p className="mb-3 mt-1 text-sm text-muted-foreground">
                  Optional — weave charts into the narrative you described.
                </p>
                <FileUpload />
              </CardContent>
            </Card>
            <DataPreview />
          </TabsContent>
        </Tabs>

        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={store.autoGenerateImages}
              onChange={(e) => store.setAutoGenerateImages(e.target.checked)}
            />
            <span>
              <span className="font-medium">AI images for key slides</span>
              <span className="block text-xs text-muted-foreground">
                Up to 3 visuals based on your description (may add a minute).
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={store.autoGenerateChartData}
              onChange={(e) => store.setAutoGenerateChartData(e.target.checked)}
            />
            <span>
              <span className="font-medium">Sample chart data from AI</span>
              <span className="block text-xs text-muted-foreground">
                When no file is uploaded, generate plausible numbers for chart slides.
              </span>
            </span>
          </label>
        </div>

        <ActionButton
          size="lg"
          className="w-full"
          disabled={!canGenerate}
          loading={busy || generate.isPending}
          loadingText="Generating…"
          onClick={startGenerate}
        >
          <Sparkles className="mr-2 h-4 w-4" /> Generate deck
        </ActionButton>

        {!canGenerate && !busy && !generate.isPending && (
          <p className="text-center text-xs text-muted-foreground">
            {dataRequired && !hasData
              ? "Upload a data file to continue."
              : descriptionRequired && !hasDescription && !hasData
                ? "Add a description or upload a data file."
                : "Fill in the required fields above."}
          </p>
        )}
      </div>

      {/* Controls sidebar */}
      <div className="space-y-5">
        <div>
          <Label className="mb-2 block">Slides</Label>
          <div className="flex gap-2">
            {SLIDE_COUNT_PRESETS.map((n) => (
              <Button
                key={n}
                type="button"
                variant={
                  !customCount && store.slideCount === n ? "default" : "outline"
                }
                size="sm"
                className="flex-1"
                onClick={() => {
                  setCustomCount(false);
                  store.setSlideCount(n);
                }}
              >
                {n}
              </Button>
            ))}
            <Button
              type="button"
              variant={customCount ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setCustomCount(true)}
            >
              Custom
            </Button>
          </div>
          {customCount && (
            <Input
              type="number"
              min={3}
              max={30}
              value={store.slideCount}
              onChange={(e) =>
                store.setSlideCount(
                  Math.max(3, Math.min(30, Number(e.target.value) || 10))
                )
              }
              className="mt-2"
            />
          )}
        </div>

        <div>
          <Label className="mb-2 block">Tone</Label>
          <Select value={store.tone} onValueChange={(v) => store.setTone(v as never)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-2 block">Audience</Label>
          <Select
            value={store.audience}
            onValueChange={(v) => store.setAudience(v as never)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-2 block">Language</Label>
          <Select
            value={store.language}
            onValueChange={(v) => store.setLanguage(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.nativeName ? `${o.label} — ${o.nativeName}` : o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <BrandKitPicker />

        <div>
          <Label className="mb-2 block">Theme</Label>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((theme) => {
              const active = store.themeId === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => store.setThemeId(theme.id)}
                  className={`flex flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors ${
                    active
                      ? "border-primary ring-1 ring-primary"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <div className="flex gap-1">
                    {[theme.palette.primary, theme.palette.secondary, theme.palette.accent].map(
                      (c) => (
                        <span
                          key={c}
                          className="h-4 w-4 rounded-full border border-black/5"
                          style={{ background: withHash(c) }}
                        />
                      )
                    )}
                  </div>
                  <span className="text-xs font-medium leading-tight">
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2">
            <CustomThemePicker />
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <CompetitorDeckUpload />
          </CardContent>
        </Card>

        <LogoUpload />
      </div>
    </div>
    </>
  );
}

function DescriptionField({ required = false }: { required?: boolean }) {
  const store = useBuilderStore();
  return (
    <>
      <Label htmlFor="description" className="text-base">
        Describe your presentation
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <p className="mb-3 mt-1 text-sm text-muted-foreground">
        What is it about, what should it cover, who is it for?
      </p>
      <Textarea
        id="description"
        value={store.description}
        onChange={(e) =>
          store.setDescription(e.target.value.slice(0, MAX_CHARS))
        }
        placeholder="e.g. Q3 Revenue Review — focus on regional performance and YoY comparison. Include a title slide, regional breakdown, key metrics, and a closing ask."
        className="min-h-[220px] resize-y text-base leading-relaxed"
      />
      <div className="mt-2 text-right font-mono text-xs text-muted-foreground">
        {store.description.length} / {MAX_CHARS}
      </div>
    </>
  );
}
