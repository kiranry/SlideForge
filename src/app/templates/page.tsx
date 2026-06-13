"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { ApplyTemplateDialog } from "@/components/apply-template-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { TemplateGridSkeleton } from "@/components/loading-states";
import { DECK_TEMPLATES } from "@/lib/templates";
import { saveDeck } from "@/lib/storage";
import {
  deleteTemplate,
  listTemplates,
} from "@/lib/template-storage";
import { useBuilderStore } from "@/lib/store";
import type { SavedDeckTemplate } from "@/lib/templates/saved-template";

function kindLabel(kind: SavedDeckTemplate["kind"]): string {
  switch (kind) {
    case "weekly_report":
      return "Weekly Report";
    case "skeleton":
      return "Skeleton";
    default:
      return "Prompt";
  }
}

export default function TemplatesPage() {
  const router = useRouter();
  const store = useBuilderStore();
  const [myTemplates, setMyTemplates] = useState<SavedDeckTemplate[] | null>(null);
  const [openingSkeletonId, setOpeningSkeletonId] = useState<string | null>(null);

  useEffect(() => {
    setMyTemplates(listTemplates());
  }, []);

  const applyBuiltin = (id: string) => {
    const t = DECK_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    store.setDescription(t.prompt);
    store.setSlideCount(t.slideCount);
    store.setTone(t.tone);
    store.setAudience(t.audience);
    store.setMode("description");
    router.push("/create");
  };

  const openSkeleton = async (template: SavedDeckTemplate) => {
    if (!template.skeletonManifest) {
      toast.error("Template has no manifest.");
      return;
    }
    setOpeningSkeletonId(template.id);
    try {
      const id = uuidv4();
      await saveDeck({
        id,
        createdAt: new Date().toISOString(),
        mode: "description",
        manifest: template.skeletonManifest,
        suppressedAnomalyIds: [],
      });
      router.push(`/preview/${id}`);
    } finally {
      setOpeningSkeletonId(null);
    }
  };

  const removeTemplate = (id: string) => {
    deleteTemplate(id);
    setMyTemplates(listTemplates());
    toast.success("Template deleted");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Templates
          </h1>
          <p className="mt-2 text-muted-foreground">
            Built-in prompts for new decks, or your saved structures for weekly
            reports.
          </p>
        </header>

        <Tabs defaultValue="builtin">
          <TabsList>
            <TabsTrigger value="builtin">Built-in</TabsTrigger>
            <TabsTrigger value="mine">My templates</TabsTrigger>
          </TabsList>

          <TabsContent value="builtin" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {DECK_TEMPLATES.map((t) => (
                <Card
                  key={t.id}
                  className="group cursor-pointer transition-colors hover:border-primary/40"
                  onClick={() => applyBuiltin(t.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{t.name}</CardTitle>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {t.slideCount} slides
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {t.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 px-0 text-primary group-hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        applyBuiltin(t.id);
                      }}
                    >
                      Use template <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="mine" className="mt-6">
            {myTemplates === null ? (
              <TemplateGridSkeleton count={2} />
            ) : myTemplates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-10 text-center">
                <p className="text-muted-foreground">
                  No saved templates yet. Open a deck in preview or export and
                  choose <strong>Save as template</strong>.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/history">View your decks</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {myTemplates.map((t) => (
                  <Card key={t.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{t.name}</CardTitle>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {kindLabel(t.kind)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t.skeletonManifest?.slides.length ?? 0} slides ·{" "}
                        {t.theme}
                        {t.bindings?.length
                          ? ` · ${t.bindings.length} data binding(s)`
                          : ""}
                      </p>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-2">
                      {t.kind === "weekly_report" ? (
                        <ApplyTemplateDialog template={t} />
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={openingSkeletonId === t.id}
                          onClick={() => openSkeleton(t)}
                        >
                          {openingSkeletonId === t.id ? (
                            <>
                              <Spinner size="sm" /> Opening…
                            </>
                          ) : (
                            "Open skeleton"
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => removeTemplate(t.id)}
                        aria-label="Delete template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Or{" "}
          <Link
            href="/create"
            className="text-primary underline-offset-4 hover:underline"
          >
            start from scratch
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
