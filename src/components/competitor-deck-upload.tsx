"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Presentation, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useBuilderStore } from "@/lib/store";
import type { DeckStructure } from "@/lib/types";

const MAX_BYTES = 15 * 1024 * 1024;

export function CompetitorDeckUpload() {
  const store = useBuilderStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const skeleton = store.structureSkeleton;

  const upload = useMutation({
    mutationFn: async (file: File): Promise<DeckStructure> => {
      if (file.size > MAX_BYTES) throw new Error("File exceeds 15 MB limit.");
      if (!file.name.toLowerCase().endsWith(".pptx")) {
        throw new Error("Only .pptx files are supported.");
      }
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/parse-pptx", { method: "POST", body: form });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Parse failed");
      }
      const { structure } = (await res.json()) as { structure: DeckStructure };
      return structure;
    },
    onSuccess: (structure) => {
      store.setStructureSkeleton(structure);
      toast.success(
        `Extracted ${structure.slideCount} slides from ${structure.fileName}`
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const onFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) upload.mutate(file);
    },
    [upload]
  );

  return (
    <div>
      <Label className="text-base">Match a competitor deck</Label>
      <p className="mb-3 mt-1 text-sm text-muted-foreground">
        Upload a .pptx to mirror its structure with your content.
      </p>

      {skeleton ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Presentation className="h-4 w-4 text-primary" />
              <div>
                <p className="font-medium">{skeleton.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {skeleton.slideCount} slides — structure will guide generation
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => store.setStructureSkeleton(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ol className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
            {skeleton.slides.slice(0, 8).map((s) => (
              <li key={s.index}>
                {s.index}. [{s.inferredType}] {s.title}
              </li>
            ))}
            {skeleton.slides.length > 8 && (
              <li>…and {skeleton.slides.length - 8} more</li>
            )}
          </ol>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          {upload.isPending ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Drag a .pptx here or{" "}
            <button
              type="button"
              className="text-primary underline"
              onClick={() => inputRef.current?.click()}
            >
              browse
            </button>
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".pptx"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      )}
    </div>
  );
}
