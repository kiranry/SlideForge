"use client";

import React from "react";
import { SlideCanvas } from "@/components/slide-canvas";
import type { AnomalyFlag, CustomThemePalette, ParsedData, Slide } from "@/lib/types";

interface SlideThumbnailProps {
  slide: Slide;
  themeId: string;
  data?: ParsedData | null;
  rtl?: boolean;
  anomalyFlags?: AnomalyFlag[];
  suppressedAnomalyIds?: string[];
  customPalette?: CustomThemePalette | null;
  logoDataUrl?: string | null;
  index: number;
  selected: boolean;
  onSelect: () => void;
}

/** Memoized thumbnail — avoids re-rendering all slides on every keystroke. */
export const SlideThumbnail = React.memo(function SlideThumbnail({
  slide,
  themeId,
  data,
  rtl,
  anomalyFlags,
  suppressedAnomalyIds,
  customPalette,
  logoDataUrl,
  index,
  selected,
  onSelect,
}: SlideThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
        selected
          ? "border-primary"
          : "border-border hover:border-muted-foreground/40"
      }`}
      style={{ width: 140 }}
      aria-label={`Slide ${index + 1}`}
      aria-current={selected ? "true" : undefined}
    >
      <SlideCanvas
        slide={slide}
        themeId={themeId}
        data={data}
        width={140}
        rtl={rtl}
        anomalyFlags={anomalyFlags}
        suppressedAnomalyIds={suppressedAnomalyIds}
        customPalette={customPalette}
        logoDataUrl={logoDataUrl}
      />
      <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] text-white">
        {index + 1}
      </span>
    </button>
  );
});
