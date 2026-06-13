"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseFileClient } from "@/lib/parse-client";
import { useBuilderStore } from "@/lib/store";
import type { ChartRecommendation, ParsedData } from "@/lib/types";

const ACCEPT = ".xlsx,.xls,.csv,.pdf";
const MAX_BYTES = 10 * 1024 * 1024;

async function parsePdf(file: File): Promise<ParsedData> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/parse-data", { method: "POST", body: form });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error || "PDF parse failed");
  }
  const { data } = (await res.json()) as { data: ParsedData };
  return data;
}

async function fetchRecommendations(data: ParsedData): Promise<ChartRecommendation[]> {
  const res = await fetch("/api/recommend-charts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { recommendations?: ChartRecommendation[] };
  return json.recommendations ?? [];
}

export function FileUpload() {
  const store = useBuilderStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_BYTES) throw new Error("File exceeds 10 MB limit.");
      const lower = file.name.toLowerCase();
      const data = lower.endsWith(".pdf")
        ? await parsePdf(file)
        : await parseFileClient(file);
      if (data.sheets.length === 0) throw new Error("No data found in file.");
      const recommendations = await fetchRecommendations(data);
      return { data, recommendations };
    },
    onSuccess: ({ data, recommendations }) => {
      store.setParsedData(data);
      store.setChartRecommendations(recommendations);
      toast.success(`Parsed ${data.sheets.length} sheet(s) from ${data.fileName}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || upload.isPending) return;
      upload.mutate(file);
    },
    [upload]
  );

  const clear = () => {
    store.setParsedData(null);
    store.setChartRecommendations(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const parsed = store.parsedData;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!parsed ? (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
          }`}
        >
          {upload.isPending ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Parsing file…</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop a file here or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Excel (.xlsx, .xls), CSV, or PDF — max 10 MB
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{parsed.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {parsed.sheets.length} sheet(s) · {parsed.sheets.reduce((n, s) => n + s.rowCount, 0)} rows
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clear}
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
