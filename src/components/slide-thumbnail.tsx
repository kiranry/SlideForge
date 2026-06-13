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
    <div className="relative shrink-0" style={{ width: 140 }}>
      <button
        type="button"
        onClick={onSelect}
        className={`block w-full overflow-hidden rounded-md border-2 transition-colors ${
          selected
            ? "border-primary"
            : "border-border hover:border-muted-foreground/40"
        }`}
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
      </button>
      <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-10 rounded bg-black/70 px-1.5 py-px text-[10px] font-medium leading-none text-white shadow-sm">
        {index + 1}
      </span>
    </div>
  );
});
