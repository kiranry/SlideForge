"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  ArrowLeft,
  FileText,
  Check,
  Mic,
  FileArchive,
  FileType,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SlideCanvas } from "@/components/slide-canvas";
import { AnomalyPanel } from "@/components/anomaly-panel";
import { SaveTemplateDialog } from "@/components/save-template-dialog";
import { loadDeck, updateDeck } from "@/lib/storage";
import { detectAnomalies } from "@/lib/anomalies";
import { ensureRasterLogo } from "@/lib/logo-rasterize";
import { withTiming } from "@/lib/telemetry";
import { pushDeckVersion } from "@/lib/deck-versions";
import { resolveDeckTheme } from "@/lib/deck-theme";
import { getTheme, CUSTOM_THEME_ID } from "@/lib/themes";
import type { StoredDeck } from "@/lib/types";

export function ExportPanel({ id }: { id: string }) {
  const [deck, setDeck] = useState<StoredDeck | null | undefined>(undefined);
  const [pptxDone, setPptxDone] = useState(false);
  const [pdfIncludeNotes, setPdfIncludeNotes] = useState(false);
  const [pdfLayout, setPdfLayout] = useState<"stacked" | "grid">("stacked");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadDeck(id);
      if (cancelled) return;
      if (loaded?.data && !loaded.anomalyFlags?.length) {
        const flags = detectAnomalies(loaded.data);
        if (flags.length) {
          const updated = await updateDeck(id, { anomalyFlags: flags });
          if (!cancelled) setDeck(updated ?? loaded);
          return;
        }
      }
      setDeck(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const exportBody = () => {
    if (!deck) throw new Error("Deck not loaded");
    const resolved = resolveDeckTheme(deck);
    return {
      manifest: deck.manifest,
      data: deck.data,
      customTheme:
        deck.manifest.theme === CUSTOM_THEME_ID ? deck.customTheme : undefined,
      logoDataUrl: deck.logoDataUrl,
      logoOnAllSlides: deck.logoOnAllSlides,
      anomalyFlags: deck.anomalyFlags,
      suppressedAnomalyIds: deck.suppressedAnomalyIds,
      headingFont: resolved.headingFont,
      bodyFont: resolved.bodyFont,
      chartColors: resolved.chartColors,
    };
  };

  const downloadPptx = useMutation({
    mutationFn: async () => {
      const body = exportBody();
      const logoDataUrl = await ensureRasterLogo(body.logoDataUrl);
      return withTiming("export.pptx", async () => {
        const res = await fetch("/api/generate-pptx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, logoDataUrl }),
        });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(error || "Export failed");
        }
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition") || "";
        const match = cd.match(/filename="(.+?)"/);
        saveAs(blob, match?.[1] || "slideforge-deck.pptx");
      });
    },
    onSuccess: async () => {
      await saveVersionSnapshot();
      setPptxDone(true);
      toast.success("PowerPoint downloaded");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveVersionSnapshot = async () => {
    if (!deck) return;
    const versions = pushDeckVersion(deck, "Export snapshot");
    const updated = await updateDeck(id, { versions });
    if (updated) setDeck(updated);
  };

  const downloadPdf = useMutation({
    mutationFn: async () => {
      if (!deck) throw new Error("Deck not loaded");
      return withTiming("export.pdf", async () => {
        const res = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manifest: deck.manifest,
            customTheme:
              deck.manifest.theme === CUSTOM_THEME_ID
                ? deck.customTheme
                : undefined,
            includeNotes: pdfIncludeNotes,
            layout: pdfLayout,
          }),
        });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(error || "PDF export failed");
        }
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition") || "";
        const match = cd.match(/filename="(.+?)"/);
        saveAs(blob, match?.[1] || "slideforge-deck.pdf");
      });
    },
    onSuccess: () => toast.success("PDF handout downloaded"),
    onError: (err: Error) => toast.error(err.message),
  });

  const downloadBundle = useMutation({
    mutationFn: async () => {
      const body = exportBody();
      const logoDataUrl = await ensureRasterLogo(body.logoDataUrl);
      return withTiming("export.bundle", async () => {
        const res = await fetch("/api/generate-bundle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, logoDataUrl }),
        });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(error || "Bundle export failed");
        }
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition") || "";
        const match = cd.match(/filename="(.+?)"/);
        saveAs(blob, match?.[1] || "slideforge-bundle.zip");
      });
    },
    onSuccess: async () => {
      await saveVersionSnapshot();
      toast.success("Export bundle downloaded");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const downloadScript = useMutation({
    mutationFn: async () => {
      if (!deck) throw new Error("Deck not loaded");
      const res = await fetch("/api/generate-presenter-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest: deck.manifest }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Script export failed");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="(.+?)"/);
      saveAs(blob, match?.[1] || "presenter-script.docx");
    },
    onSuccess: () => toast.success("Presenter script downloaded"),
    onError: (err: Error) => toast.error(err.message),
  });

  if (deck === undefined)
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (deck === null)
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">Deck not found.</p>
        <Button asChild className="mt-4">
          <Link href="/create">Create a new deck</Link>
        </Button>
      </div>
    );

  const { manifest } = deck;
  const theme = getTheme(
    manifest.theme,
    manifest.theme === CUSTOM_THEME_ID ? deck.customTheme : undefined
  );
  const resolved = resolveDeckTheme(deck);
  const canvasProps = {
    customPalette:
      manifest.theme === CUSTOM_THEME_ID ? deck.customTheme : undefined,
    logoDataUrl: deck.logoDataUrl,
    headingFont: resolved.headingFont,
    bodyFont: resolved.bodyFont,
    deckChartColors: resolved.chartColors,
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/preview/${id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to preview
          </Link>
        </Button>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {manifest.slides.slice(0, 6).map((s, i) => (
            <div key={i} className="overflow-hidden rounded-md border border-border">
              <SlideCanvas
                slide={s}
                themeId={manifest.theme}
                data={deck.data}
                width={220}
                rtl={manifest.rtl}
                anomalyFlags={deck.anomalyFlags}
                suppressedAnomalyIds={deck.suppressedAnomalyIds}
                {...canvasProps}
              />
            </div>
          ))}
        </div>
        {manifest.slides.length > 6 && (
          <p className="mt-3 text-sm text-muted-foreground">
            + {manifest.slides.length - 6} more slides
          </p>
        )}
      </div>

      <div className="space-y-5">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <h2 className="font-display text-2xl font-semibold leading-tight">
                {manifest.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {manifest.slides.length} slides · {theme.name}
              </p>
              {deck.dataModified && (
                <Badge variant="outline" className="mt-2 text-amber-700">
                  Chart data modified in app
                </Badge>
              )}
            </div>

            <Button
              size="lg"
              className="w-full"
              onClick={() => downloadPptx.mutate()}
              disabled={downloadPptx.isPending}
            >
              {downloadPptx.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building .pptx…
                </>
              ) : pptxDone ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Download again
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" /> Download PowerPoint
                </>
              )}
            </Button>

            <div className="flex justify-center">
              <SaveTemplateDialog deck={deck} />
            </div>

            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => downloadBundle.mutate()}
              disabled={downloadBundle.isPending}
            >
              {downloadBundle.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building zip…
                </>
              ) : (
                <>
                  <FileArchive className="mr-2 h-4 w-4" /> Download bundle (.zip)
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Zip includes .pptx, presenter-script.docx, and source-data.csv
            </p>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <Label className="text-xs font-medium">PDF handout</Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pdfIncludeNotes}
                  onChange={(e) => setPdfIncludeNotes(e.target.checked)}
                />
                Include speaker notes
              </label>
              <Select
                value={pdfLayout}
                onValueChange={(v) => setPdfLayout(v as "stacked" | "grid")}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stacked">One slide per page</SelectItem>
                  <SelectItem value="grid">Two slides per page (grid)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="w-full"
                disabled={downloadPdf.isPending}
                onClick={() => downloadPdf.mutate()}
              >
                {downloadPdf.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building PDF…
                  </>
                ) : (
                  <>
                    <FileType className="mr-2 h-4 w-4" /> Download PDF handout
                  </>
                )}
              </Button>
            </div>

            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => downloadScript.mutate()}
              disabled={downloadScript.isPending}
            >
              {downloadScript.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing script…
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" /> Download presenter script (AI)
                </>
              )}
            </Button>

            {deck.data && deck.anomalyFlags && deck.anomalyFlags.length > 0 && (
              <AnomalyPanel
                flags={deck.anomalyFlags}
                suppressed={deck.suppressedAnomalyIds ?? []}
                onSuppress={async (flagId) => {
                  const updated = await updateDeck(id, {
                    suppressedAnomalyIds: [
                      ...(deck.suppressedAnomalyIds ?? []),
                      flagId,
                    ],
                  });
                  if (updated) setDeck(updated);
                }}
                onRestore={async (flagId) => {
                  const updated = await updateDeck(id, {
                    suppressedAnomalyIds: (deck.suppressedAnomalyIds ?? []).filter(
                      (x) => x !== flagId
                    ),
                  });
                  if (updated) setDeck(updated);
                }}
              />
            )}

            <div className="flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              <FileText className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                PowerPoint includes native charts and speaker notes. The bundle
                zip packages pptx, a Word script (from your notes), and CSV data.
                PDF handouts are vector layouts for printing or sharing.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
