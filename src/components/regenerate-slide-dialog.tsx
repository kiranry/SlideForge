"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Slide, SlideManifest } from "@/lib/types";

const PRESETS = [
  "Make this slide more visual",
  "Simplify the bullets",
  "Add more data and specifics",
  "Make it more executive-friendly",
];

interface RegenerateSlideDialogProps {
  slide: Slide;
  manifest: SlideManifest;
  onRegenerated: (slide: Slide) => void;
  compact?: boolean;
}

export function RegenerateSlideDialog({
  slide,
  manifest,
  onRegenerated,
  compact = false,
}: RegenerateSlideDialogProps) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");

  const regenerate = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/regenerate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slide,
          instruction: instruction.trim(),
          context: {
            deckTitle: manifest.title,
            tone: manifest.tone,
            audience: manifest.audience,
          },
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Regeneration failed");
      }
      const { slide: updated } = (await res.json()) as { slide: Slide };
      return updated;
    },
    onSuccess: (updated) => {
      toast.success("Slide updated");
      onRegenerated(updated);
      setOpen(false);
      setInstruction("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const locked = slide.locked ?? false;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={locked}
            title="Regenerate slide"
            aria-label="Regenerate slide"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={locked}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerate
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Regenerate this slide</DialogTitle>
        </DialogHeader>
        {locked ? (
          <p className="text-sm text-amber-700">
            This slide is locked. Unlock it in the assembly toolbar to regenerate.
          </p>
        ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p}
                type="button"
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() => setInstruction(p)}
              >
                {p}
              </Button>
            ))}
          </div>
          <div>
            <Label htmlFor="regen-instruction">Custom instruction</Label>
            <Textarea
              id="regen-instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Turn this into 3 punchy bullets with numbers"
              className="mt-2 min-h-[100px]"
            />
          </div>
          <Button
            className="w-full"
            disabled={!instruction.trim() || regenerate.isPending}
            onClick={() => regenerate.mutate()}
          >
            {regenerate.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Regenerating…
              </>
            ) : (
              "Regenerate slide"
            )}
          </Button>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
