"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Shuffle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { v4 as uuidv4 } from "uuid";
import { saveDeck } from "@/lib/storage";
import {
  countLockedSlides,
  mergeRemixWithLockedSlides,
} from "@/lib/slide-assembly";
import type { SlideManifest, StoredDeck } from "@/lib/types";

const PRESETS: {
  target: "executive_summary" | "technical_deep_dive" | "sales_pitch";
  label: string;
  description: string;
}[] = [
  {
    target: "executive_summary",
    label: "Executive Summary",
    description: "~5 slides — outcomes and numbers for leadership",
  },
  {
    target: "technical_deep_dive",
    label: "Technical Deep Dive",
    description: "~15 slides — methodology and detail for engineers",
  },
  {
    target: "sales_pitch",
    label: "Sales Pitch",
    description: "~10 slides — problem, proof, ROI, closing ask",
  },
];

interface RemixDialogProps {
  deck: StoredDeck;
  compact?: boolean;
}

export function RemixDialog({ deck, compact = false }: RemixDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const remix = useMutation({
    mutationFn: async (
      target: "executive_summary" | "technical_deep_dive" | "sales_pitch"
    ) => {
      const res = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest: deck.manifest, target }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Remix failed");
      }
      const { manifest } = (await res.json()) as { manifest: SlideManifest };
      return manifest;
    },
    onSuccess: async (manifest) => {
      const merged = mergeRemixWithLockedSlides(deck.manifest, manifest);
      const newId = uuidv4();
      await saveDeck({
        ...deck,
        id: newId,
        createdAt: new Date().toISOString(),
        manifest: merged,
      });
      toast.success("Remixed deck created");
      setOpen(false);
      router.push(`/preview/${newId}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const lockedCount = countLockedSlides(deck.manifest.slides);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Remix deck"
            aria-label="Remix deck"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Shuffle className="mr-1.5 h-3.5 w-3.5" /> Remix
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remix for a different audience</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Re-generate this deck with the same facts, reframed for a new audience.
        </p>
        {lockedCount > 0 && (
          <p className="text-sm text-amber-700">
            {lockedCount} locked slide{lockedCount === 1 ? "" : "s"} will stay at
            their positions unchanged.
          </p>
        )}
        <div className="mt-4 space-y-2">
          {PRESETS.map((p) => (
            <button
              key={p.target}
              type="button"
              disabled={remix.isPending}
              onClick={() => remix.mutate(p.target)}
              className="flex w-full flex-col rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-muted/40 disabled:opacity-50"
            >
              <span className="font-medium">{p.label}</span>
              <span className="text-xs text-muted-foreground">{p.description}</span>
            </button>
          ))}
        </div>
        {remix.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Remixing…
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
