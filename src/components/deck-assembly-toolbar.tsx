"use client";

import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Lock,
  LockOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SLIDE_TYPES } from "@/lib/schema";
import { slideTypeLabel } from "@/lib/slide-defaults";
import type { Slide, SlideType } from "@/lib/types";

interface DeckAssemblyToolbarProps {
  slide: Slide;
  slideIndex: number;
  slideCount: number;
  onAdd: (type: SlideType) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleLock: () => void;
  compact?: boolean;
}

/** Add / duplicate / delete / reorder / lock controls (Phase 10). */
export function DeckAssemblyToolbar({
  slide,
  slideIndex,
  slideCount,
  onAdd,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleLock,
  compact = false,
}: DeckAssemblyToolbarProps) {
  const [addType, setAddType] = useState<SlideType>("content");

  if (compact) {
    return (
      <div
        className="flex flex-wrap items-center gap-1"
        role="group"
        aria-label="Slide assembly"
      >
        <Select value={addType} onValueChange={(v) => setAddType(v as SlideType)}>
          <SelectTrigger
            className="h-8 w-[108px] text-xs"
            aria-label="New slide type"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SLIDE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {slideTypeLabel(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onAdd(addType)}
          aria-label="Add slide after current"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onDuplicate}
          aria-label="Duplicate slide"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={slideCount <= 1}
          onClick={onDelete}
          aria-label="Delete slide"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={slideIndex === 0}
          onClick={onMoveUp}
          aria-label="Move slide up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={slideIndex >= slideCount - 1}
          onClick={onMoveDown}
          aria-label="Move slide down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={slide.locked ? "default" : "outline"}
          size="icon"
          className="h-8 w-8"
          onClick={onToggleLock}
          aria-label={slide.locked ? "Unlock slide" : "Lock slide"}
          aria-pressed={slide.locked ?? false}
        >
          {slide.locked ? (
            <Lock className="h-3.5 w-3.5" />
          ) : (
            <LockOpen className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2"
      role="group"
      aria-label="Slide assembly"
    >
      <Select
        value={addType}
        onValueChange={(v) => setAddType(v as SlideType)}
      >
        <SelectTrigger className="h-8 w-[130px]" aria-label="New slide type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SLIDE_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {slideTypeLabel(t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onAdd(addType)}
        aria-label="Add slide after current"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add slide
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onDuplicate}
        aria-label="Duplicate slide"
      >
        <Copy className="mr-1.5 h-3.5 w-3.5" /> Duplicate
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={slideCount <= 1}
        onClick={onDelete}
        aria-label="Delete slide"
      >
        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={slideIndex === 0}
        onClick={onMoveUp}
        aria-label="Move slide up"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={slideIndex >= slideCount - 1}
        onClick={onMoveDown}
        aria-label="Move slide down"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant={slide.locked ? "default" : "outline"}
        size="sm"
        onClick={onToggleLock}
        aria-label={slide.locked ? "Unlock slide" : "Lock slide"}
        aria-pressed={slide.locked ?? false}
      >
        {slide.locked ? (
          <Lock className="mr-1.5 h-3.5 w-3.5" />
        ) : (
          <LockOpen className="mr-1.5 h-3.5 w-3.5" />
        )}
        {slide.locked ? "Locked" : "Lock"}
      </Button>
    </div>
  );
}
