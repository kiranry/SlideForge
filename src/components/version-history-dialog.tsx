"use client";

import { useState } from "react";
import { toast } from "sonner";
import { History, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { restoreDeckVersion } from "@/lib/deck-versions";
import type { StoredDeck } from "@/lib/types";

interface VersionHistoryDialogProps {
  deck: StoredDeck;
  onRestore: (manifest: StoredDeck["manifest"]) => Promise<void>;
  compact?: boolean;
}

export function VersionHistoryDialog({
  deck,
  onRestore,
  compact = false,
}: VersionHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const versions = deck.versions ?? [];

  const handleRestore = async (versionId: string) => {
    const manifest = restoreDeckVersion(deck, versionId);
    if (!manifest) {
      toast.error("Version not found.");
      return;
    }
    setRestoring(versionId);
    try {
      await onRestore(manifest);
      toast.success("Deck restored to selected version");
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not restore version."
      );
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={versions.length === 0}
            title="Version history"
            aria-label="Version history"
          >
            <History className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={versions.length === 0}>
            <History className="mr-1.5 h-3.5 w-3.5" /> Versions
            {versions.length > 0 && (
              <span className="ml-1 font-mono text-xs">{versions.length}</span>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
        </DialogHeader>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Snapshots are saved automatically when you export PowerPoint.
          </p>
        ) : (
          <ul className="space-y-2">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {v.label ?? "Export snapshot"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.createdAt).toLocaleString()} ·{" "}
                    {v.manifest.slides.length} slides
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={restoring === v.id}
                  onClick={() => handleRestore(v.id)}
                >
                  {restoring === v.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  )}
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
