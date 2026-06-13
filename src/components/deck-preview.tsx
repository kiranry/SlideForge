"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowLeft,
  Sparkles,
  Loader2,
  RotateCcw,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SlideCanvas } from "@/components/slide-canvas";
import { RegenerateSlideDialog } from "@/components/regenerate-slide-dialog";
import { RemixDialog } from "@/components/remix-dialog";
import { SaveTemplateDialog } from "@/components/save-template-dialog";
import { ShareDialog } from "@/components/share-dialog";
import { DeckCommentsPanel } from "@/components/deck-comments-panel";
import { VersionHistoryDialog } from "@/components/version-history-dialog";
import { AnomalyPanel } from "@/components/anomaly-panel";
import { SlideMediaPanel } from "@/components/slide-media-panel";
import { ChartControlsPanel } from "@/components/chart-controls-panel";
import { SlideFilmstrip } from "@/components/slide-filmstrip";
import { DeckAssemblyToolbar } from "@/components/deck-assembly-toolbar";
import { loadDeck, updateDeck } from "@/lib/storage";
import { createBlankSlide } from "@/lib/slide-defaults";
import {
  duplicateSlideAt,
  insertSlideAt,
  moveSlide,
  removeSlideAt,
} from "@/lib/slide-assembly";
import { createManifestHistory } from "@/lib/deck-history";
import { clearAllElementBoxes } from "@/lib/element-boxes";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";
import { detectAnomalies } from "@/lib/anomalies";
import { insertInsightSlides, hasInsightSlides } from "@/lib/insights";
import { resolveDeckTheme } from "@/lib/deck-theme";
import { CUSTOM_THEME_ID } from "@/lib/themes";
import { fitSlideStageSize } from "@/lib/slide-stage-size";
import type {
  ParsedData,
  Slide,
  SlideManifest,
  SlideType,
  StoredDeck,
} from "@/lib/types";

function useSlideStage(ready: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => fitSlideStageSize(720, 405));

  useLayoutEffect(() => {
    if (!ready) return;
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const { width: cw, height: ch } = el.getBoundingClientRect();
      setSize(fitSlideStageSize(cw, ch));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  return { ref, width: size.width, height: size.height };
}

function canvasProps(deck: StoredDeck) {
  const resolved = resolveDeckTheme(deck);
  return {
    customPalette:
      deck.manifest.theme === CUSTOM_THEME_ID ? deck.customTheme : undefined,
    logoDataUrl: deck.logoDataUrl,
    headingFont: resolved.headingFont,
    bodyFont: resolved.bodyFont,
    deckChartColors: resolved.chartColors,
  };
}

export function DeckPreview({ id }: { id: string }) {
  const router = useRouter();
  const [deck, setDeck] = useState<StoredDeck | null | undefined>(undefined);
  const [current, setCurrent] = useState(0);
  const [localSlide, setLocalSlide] = useState<Slide | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const historyRef = useRef(
    createManifestHistory({ title: "", theme: "", language: "en", slides: [] })
  );
  const skipHistoryRef = useRef(false);
  const deckReady = deck !== undefined && deck !== null;
  const { ref: stageRef, width: stageWidth, height: stageHeight } =
    useSlideStage(deckReady);

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadDeck(id);
      if (cancelled) return;
      if (loaded?.data && !loaded.anomalyFlags?.length) {
        const flags = detectAnomalies(loaded.data);
        if (flags.length) {
          const updated = await updateDeck(id, { anomalyFlags: flags });
          if (!cancelled) {
            if (updated) {
              historyRef.current.reset(updated.manifest);
              syncHistoryFlags();
              setDeck(updated);
            }
          }
          return;
        }
      }
      if (loaded) {
        historyRef.current.reset(loaded.manifest);
        syncHistoryFlags();
      }
      setDeck(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, syncHistoryFlags]);

  const persist = async (patch: Partial<StoredDeck>) => {
    try {
      const updated = await updateDeck(id, patch);
      if (updated) setDeck(updated);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save deck changes."
      );
    }
  };

  const persistManifest = async (
    manifest: SlideManifest,
    recordHistory = true
  ) => {
    if (recordHistory && !skipHistoryRef.current) {
      historyRef.current.push(manifest);
    }
    skipHistoryRef.current = false;
    syncHistoryFlags();
    await persist({ manifest });
  };

  const attachData = async (data: ParsedData) => {
    const flags = detectAnomalies(data);
    try {
      const updated = await updateDeck(id, {
        data,
        anomalyFlags: flags,
        dataModified: false,
      });
      if (updated) setDeck(updated);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not attach data file."
      );
    }
  };

  const persistData = useCallback(
    async (data: ParsedData) => {
      const flags = detectAnomalies(data);
      try {
        const updated = await updateDeck(id, {
          data,
          anomalyFlags: flags,
          dataModified: true,
        });
        if (updated) setDeck(updated);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not save data changes."
        );
      }
    },
    [id]
  );

  const debouncedPersistData = useDebouncedCallback(persistData, 300);

  const handleDataChange = useCallback(
    (data: ParsedData) => {
      const flags = detectAnomalies(data);
      setDeck((d) =>
        d ? { ...d, data, anomalyFlags: flags, dataModified: true } : d
      );
      debouncedPersistData(data);
    },
    [debouncedPersistData]
  );

  const replaceSlide = useCallback(
    async (index: number, slide: Slide) => {
      const d = await loadDeck(id);
      if (!d) return;
      const slides = [...d.manifest.slides];
      slides[index] = { ...slide, index: index + 1 };
      const manifest = { ...d.manifest, slides };
      if (!skipHistoryRef.current) {
        historyRef.current.push(manifest);
      }
      skipHistoryRef.current = false;
      syncHistoryFlags();
      try {
        const updated = await updateDeck(id, { manifest });
        if (updated) setDeck(updated);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not save slide changes."
        );
      }
    },
    [id, syncHistoryFlags]
  );

  const debouncedReplaceSlide = useDebouncedCallback(
    (index: number, slide: Slide) => replaceSlide(index, slide),
    300
  );

  const handleSlideChange = useCallback(
    (slide: Slide) => {
      setLocalSlide(slide);
      debouncedReplaceSlide(current, slide);
    },
    [current, debouncedReplaceSlide]
  );

  useEffect(() => {
    if (!deck?.manifest?.slides.length) return;
    setLocalSlide(
      deck.manifest.slides[Math.min(current, deck.manifest.slides.length - 1)]
    );
  }, [current, id, deck?.id, deck?.manifest?.slides.length]);

  const applySlides = useCallback(
    async (slides: Slide[], newCurrent?: number) => {
      if (!deck) return;
      await persistManifest({ ...deck.manifest, slides });
      if (newCurrent !== undefined) setCurrent(newCurrent);
    },
    [deck]
  );

  const handleAddSlide = useCallback(
    async (type: SlideType) => {
      if (!deck) return;
      const blank = createBlankSlide(type, 0, deck.data);
      const slides = insertSlideAt(deck.manifest.slides, current + 1, blank);
      await applySlides(slides, current + 1);
      toast.success("Slide added");
    },
    [deck, current, applySlides]
  );

  const handleDuplicateSlide = useCallback(async () => {
    if (!deck) return;
    const slides = duplicateSlideAt(deck.manifest.slides, current);
    await applySlides(slides, current + 1);
    toast.success("Slide duplicated");
  }, [deck, current, applySlides]);

  const handleDeleteSlide = useCallback(async () => {
    if (!deck) return;
    try {
      const slides = removeSlideAt(deck.manifest.slides, current);
      await applySlides(slides, Math.min(current, slides.length - 1));
      toast.success("Slide removed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete slide."
      );
    }
  }, [deck, current, applySlides]);

  const handleMoveSlideUp = useCallback(async () => {
    if (!deck || current === 0) return;
    const slides = moveSlide(deck.manifest.slides, current, current - 1);
    await applySlides(slides, current - 1);
  }, [deck, current, applySlides]);

  const handleMoveSlideDown = useCallback(async () => {
    if (!deck || current >= deck.manifest.slides.length - 1) return;
    const slides = moveSlide(deck.manifest.slides, current, current + 1);
    await applySlides(slides, current + 1);
  }, [deck, current, applySlides]);

  const handleReorderSlides = useCallback(
    async (from: number, to: number) => {
      if (!deck) return;
      const slides = moveSlide(deck.manifest.slides, from, to);
      let newCurrent = current;
      if (current === from) newCurrent = to;
      else if (from < current && to >= current) newCurrent = current - 1;
      else if (from > current && to <= current) newCurrent = current + 1;
      await applySlides(slides, newCurrent);
    },
    [deck, current, applySlides]
  );

  const undoManifest = async () => {
    const prev = historyRef.current.undo();
    if (!prev) return;
    skipHistoryRef.current = true;
    syncHistoryFlags();
    await persist({ manifest: prev });
    setLocalSlide(prev.slides[Math.min(current, prev.slides.length - 1)]);
  };

  const redoManifest = async () => {
    const next = historyRef.current.redo();
    if (!next) return;
    skipHistoryRef.current = true;
    syncHistoryFlags();
    await persist({ manifest: next });
    setLocalSlide(next.slides[Math.min(current, next.slides.length - 1)]);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.isContentEditable) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "d") {
        e.preventDefault();
        handleDuplicateSlide();
        return;
      }
      if (e.key === "Delete") {
        e.preventDefault();
        handleDeleteSlide();
        return;
      }
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoManifest();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redoManifest();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDuplicateSlide, handleDeleteSlide]);

  const generateInsights = useMutation({
    mutationFn: async () => {
      if (!deck?.data) throw new Error("No data file attached.");
      const res = await fetch("/api/generate-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: deck.data }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Failed to generate insights");
      }
      const { insights } = (await res.json()) as { insights: string[] };
      return insights;
    },
    onSuccess: async (insights) => {
      if (!deck) return;
      const manifest = insertInsightSlides(deck.manifest, insights);
      await persistManifest(manifest);
      toast.success(`Added ${insights.length} insight slide(s)`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (deck === undefined) {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }
  if (deck === null) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">Deck not found.</p>
        <Button asChild className="mt-4">
          <Link href="/create">Create a new deck</Link>
        </Button>
      </div>
    );
  }

  const { manifest } = deck;
  const slides = manifest.slides;

  if (slides.length === 0) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">This deck has no slides.</p>
        <Button asChild className="mt-4">
          <Link href="/create">Create a new deck</Link>
        </Button>
      </div>
    );
  }

  const slideFromDeck = slides[Math.min(current, slides.length - 1)];
  const slide = localSlide ?? slideFromDeck;

  const cp = canvasProps(deck);

  const go = (delta: number) =>
    setCurrent((c) => Math.max(0, Math.min(slides.length - 1, c + delta)));

  const showChartPanel =
    slide.type === "chart" ||
    slide.chart ||
    deck.data?.sheets.length ||
    slide.type === "kpi" ||
    slide.type === "table";

  return (
    <div className="flex h-full min-h-0 w-full touch-manipulation flex-col xl:flex-row">
      {/* Slide filmstrip — left rail on desktop */}
      <aside
        className="hidden shrink-0 border-b border-border bg-muted/20 xl:flex xl:w-[108px] xl:flex-col xl:border-b-0 xl:border-r"
      >
        <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Slides
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
          <SlideFilmstrip
            vertical
            slides={slides}
            current={current}
            themeId={manifest.theme}
            data={deck.data}
            rtl={manifest.rtl}
            anomalyFlags={deck.anomalyFlags}
            suppressedAnomalyIds={deck.suppressedAnomalyIds}
            customPalette={cp.customPalette}
            logoDataUrl={cp.logoDataUrl}
            onSelect={setCurrent}
            onReorder={handleReorderSlides}
          />
        </div>
      </aside>

      {/* Center — slide stage */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className="flex shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 py-2 sm:px-4"
        >
          <Button variant="ghost" size="sm" className="h-8 shrink-0 px-2" asChild>
            <Link href="/create">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">
              {manifest.title}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Slide {current + 1} · {slide.is_insight ? "insight" : slide.type}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {deck.data && !hasInsightSlides(manifest) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={generateInsights.isPending}
                onClick={() => generateInsights.mutate()}
                title="Add data insights"
              >
                {generateInsights.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!canUndo}
              onClick={() => undoManifest()}
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!canRedo}
              onClick={() => redoManifest()}
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <ShareDialog deckId={id} compact />
            <VersionHistoryDialog
              deck={deck}
              compact
              onRestore={async (manifest) => {
                await persistManifest(manifest);
              }}
            />
            <SaveTemplateDialog deck={deck} compact />
            <RemixDialog deck={deck} compact />
            <RegenerateSlideDialog
              slide={slide}
              manifest={manifest}
              compact
              onRegenerated={(s) => replaceSlide(current, s)}
            />
            {slide.element_boxes &&
              Object.keys(slide.element_boxes).length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleSlideChange(clearAllElementBoxes(slide))}
                  title="Reset layout"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            <Button
              size="sm"
              className="ml-1 h-8"
              onClick={() => router.push(`/export/${id}`)}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </header>

        <div
          ref={stageRef}
          className="relative flex min-h-0 flex-1 items-center justify-center bg-[linear-gradient(180deg,hsl(var(--muted)/0.35)_0%,hsl(var(--background))_100%)] p-3 sm:p-5"
        >
          <div
            className="overflow-hidden rounded-lg border border-border/80 shadow-xl ring-1 ring-black/5"
            style={{
              width: stageWidth,
              height: stageHeight,
              background: "#fff",
            }}
          >
            <SlideCanvas
              slide={slide}
              themeId={manifest.theme}
              data={deck.data}
              width={stageWidth}
              rtl={manifest.rtl}
              anomalyFlags={deck.anomalyFlags}
              suppressedAnomalyIds={deck.suppressedAnomalyIds}
              onSlideChange={handleSlideChange}
              {...cp}
            />
          </div>
        </div>

        <footer
          className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2 sm:px-4"
        >
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => go(-1)}
            disabled={current === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {deck.dataModified && (
              <Badge variant="outline" className="text-[10px] text-amber-700">
                Data edited
              </Badge>
            )}
            <span className="font-mono tabular-nums">
              {current + 1} / {slides.length}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => go(1)}
            disabled={current === slides.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </footer>

        {/* Mobile filmstrip */}
        <div className="shrink-0 border-t border-border bg-muted/20 px-3 py-2 xl:hidden">
          <SlideFilmstrip
            slides={slides}
            current={current}
            themeId={manifest.theme}
            data={deck.data}
            rtl={manifest.rtl}
            anomalyFlags={deck.anomalyFlags}
            suppressedAnomalyIds={deck.suppressedAnomalyIds}
            customPalette={cp.customPalette}
            logoDataUrl={cp.logoDataUrl}
            onSelect={setCurrent}
            onReorder={handleReorderSlides}
          />
        </div>
      </section>

      {/* Right sidebar — slide tools */}
      <aside
        className="flex min-h-0 w-full shrink-0 flex-col border-t border-border bg-card xl:w-[min(100%,340px)] xl:border-l xl:border-t-0"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="border-b border-border px-4 py-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Slide tools
            </p>
            <DeckAssemblyToolbar
              compact
              slide={slide}
              slideIndex={current}
              slideCount={slides.length}
              onAdd={handleAddSlide}
              onDuplicate={handleDuplicateSlide}
              onDelete={handleDeleteSlide}
              onMoveUp={handleMoveSlideUp}
              onMoveDown={handleMoveSlideDown}
              onToggleLock={() =>
                handleSlideChange({ ...slide, locked: !slide.locked })
              }
            />
          </div>

          <SlideMediaPanel
            embedded
            slide={slide}
            manifest={manifest}
            deckId={id}
            onSlideChange={handleSlideChange}
          />

          {showChartPanel && (
            <ChartControlsPanel
              embedded
              slide={slide}
              data={deck.data}
              manifest={manifest}
              deckDescription={manifest.title}
              dataModified={deck.dataModified}
              anomalyFlags={deck.anomalyFlags}
              suppressedAnomalyIds={deck.suppressedAnomalyIds}
              onSlideChange={handleSlideChange}
              onDataAttach={attachData}
              onDataChange={handleDataChange}
              lockChart={slide.type === "chart"}
            />
          )}

          <div className="border-b border-border px-4 py-3">
            <label
              htmlFor="speaker-notes"
              className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Speaker notes
            </label>
            <Textarea
              id="speaker-notes"
              aria-label="Speaker notes for this slide"
              value={slide.speaker_notes ?? ""}
              onChange={(e) => {
                const notes = e.target.value;
                const updated = { ...slide, speaker_notes: notes };
                setLocalSlide(updated);
                debouncedReplaceSlide(current, updated);
              }}
              placeholder="Presenter notes…"
              className="min-h-[72px] resize-y text-sm"
            />
          </div>

          {deck.data && deck.anomalyFlags && deck.anomalyFlags.length > 0 && (
            <div className="border-b border-border px-4 py-3">
              <AnomalyPanel
                flags={deck.anomalyFlags}
                suppressed={deck.suppressedAnomalyIds ?? []}
                onSuppress={(flagId) =>
                  persist({
                    suppressedAnomalyIds: [
                      ...(deck.suppressedAnomalyIds ?? []),
                      flagId,
                    ],
                  })
                }
                onRestore={(flagId) =>
                  persist({
                    suppressedAnomalyIds: (deck.suppressedAnomalyIds ?? []).filter(
                      (x) => x !== flagId
                    ),
                  })
                }
              />
            </div>
          )}

          <div className="px-4 py-3">
            <DeckCommentsPanel
              deck={deck}
              currentSlideIndex={current}
              onCommentsChange={async (comments) => {
                await persist({ comments });
              }}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
