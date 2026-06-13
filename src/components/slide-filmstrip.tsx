"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { SlideThumbnail } from "@/components/slide-thumbnail";
import type { AnomalyFlag, CustomThemePalette, ParsedData, Slide } from "@/lib/types";

interface SlideFilmstripProps {
  slides: Slide[];
  current: number;
  themeId: string;
  data?: ParsedData | null;
  rtl?: boolean;
  anomalyFlags?: AnomalyFlag[];
  suppressedAnomalyIds?: string[];
  customPalette?: CustomThemePalette | null;
  logoDataUrl?: string | null;
  onSelect: (index: number) => void;
  onReorder?: (from: number, to: number) => void;
  readOnly?: boolean;
  /** Vertical rail for editor sidebar (no horizontal scroll). */
  vertical?: boolean;
}

/** Thumbnail rail with drag-and-drop reorder (Phase 10). */
export function SlideFilmstrip({
  slides,
  current,
  themeId,
  data,
  rtl,
  anomalyFlags,
  suppressedAnomalyIds,
  customPalette,
  logoDataUrl,
  onSelect,
  onReorder,
  readOnly = false,
  vertical = false,
}: SlideFilmstripProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragFrom(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOver(index);
  };

  const handleDrop = (toIndex: number) => {
    if (dragFrom !== null && dragFrom !== toIndex && onReorder) {
      onReorder(dragFrom, toIndex);
    }
    setDragFrom(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  return (
    <div
      className={
        vertical
          ? "flex flex-col gap-2"
          : "flex gap-3 overflow-x-auto touch-pan-x pb-2 lg:max-h-[70vh] lg:flex-col lg:overflow-y-auto lg:pr-2"
      }
      aria-label="Slide filmstrip"
    >
      {slides.map((s, i) => (
        <div
          key={`${i}-${s.index}`}
          draggable={!readOnly && !!onReorder}
          onDragStart={() => !readOnly && handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={handleDragEnd}
          className={`relative shrink-0 rounded-md transition-opacity ${
            dragOver === i ? "ring-2 ring-primary ring-offset-1" : ""
          } ${dragFrom === i ? "opacity-50" : ""}`}
        >
          <SlideThumbnail
            slide={s}
            themeId={themeId}
            data={data}
            rtl={rtl}
            anomalyFlags={anomalyFlags}
            suppressedAnomalyIds={suppressedAnomalyIds}
            customPalette={customPalette}
            logoDataUrl={logoDataUrl}
            index={i}
            selected={i === current}
            onSelect={() => onSelect(i)}
          />
          {s.locked && (
            <span
              className="absolute left-1 top-1 rounded bg-amber-500/90 p-0.5 text-white"
              title="Locked — remix and regenerate skip this slide"
            >
              <Lock className="h-3 w-3" aria-hidden />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
