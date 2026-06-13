"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import {
  FileSpreadsheet,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { LoadingOverlay, Spinner } from "@/components/ui/spinner";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyTemplateToData } from "@/lib/apply-template";
import { detectAnomalies } from "@/lib/anomalies";
import { parseFileClient } from "@/lib/parse-client";
import { saveDeck } from "@/lib/storage";
import type {
  BindingIssue,
  SavedDeckTemplate,
} from "@/lib/templates/saved-template";
import type { ParsedData } from "@/lib/types";
import { useBusyPhase } from "@/lib/use-instant-pending";

const ACCEPT = ".xlsx,.xls,.csv";
const MAX_BYTES = 10 * 1024 * 1024;

interface ApplyTemplateDialogProps {
  template: SavedDeckTemplate;
}

export function ApplyTemplateDialog({ template }: ApplyTemplateDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ParsedData | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>(
    {}
  );
  const [issues, setIssues] = useState<BindingIssue[]>([]);
  const { busy, start, redirect, reset } = useBusyPhase();

  const parseUpload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_BYTES) throw new Error("File exceeds 10 MB limit.");
      const parsed = await parseFileClient(file);
      if (parsed.sheets.length === 0) throw new Error("No data found in file.");
      return parsed;
    },
    onSuccess: (parsed) => {
      setData(parsed);
      setColumnMappings({});
      const result = applyTemplateToData({ template, data: parsed });
      setIssues(result.issues);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createDeck = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("Upload a data file first.");
      const result = applyTemplateToData({
        template,
        data,
        columnMappings,
      });
      if (result.issues.length > 0) {
        throw new Error("Resolve column mismatches before generating.");
      }
      const id = uuidv4();
      const flags = detectAnomalies(data);
      await saveDeck({
        id,
        createdAt: new Date().toISOString(),
        mode: "data",
        manifest: result.manifest,
        data,
        anomalyFlags: flags,
        suppressedAnomalyIds: [],
      });
      return id;
    },
    onSuccess: (id) => {
      redirect();
      setOpen(false);
      setData(null);
      setColumnMappings({});
      setIssues([]);
      router.push(`/preview/${id}`);
    },
    onError: (err: Error) => {
      reset();
      toast.error(err.message);
    },
  });

  const startCreateDeck = () => {
    start();
    createDeck.mutate();
  };

  const handleMappingChange = (expected: string, actual: string) => {
    setColumnMappings((prev) => ({ ...prev, [expected]: actual }));
    if (data) {
      const result = applyTemplateToData({
        template,
        data,
        columnMappings: { ...columnMappings, [expected]: actual },
      });
      setIssues(result.issues);
    }
  };

  const clearFile = () => {
    setData(null);
    setColumnMappings({});
    setIssues([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <LoadingOverlay
        open={busy}
        label={createDeck.isPending ? "Generating deck…" : "Opening preview…"}
      />
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> New data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Regenerate from new file</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Upload a new Excel or CSV file. Slide order and chart types stay the
          same; data columns are matched by name.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) parseUpload.mutate(file);
          }}
        />

        {!data ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={parseUpload.isPending}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-8 transition-colors hover:border-primary hover:bg-muted/30"
          >
            {parseUpload.isPending ? (
              <Spinner size="lg" className="gap-0" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              Drop Excel or CSV, or click to browse
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{data.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {data.sheets.length} sheet(s)
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearFile}
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {issues.length > 0 && data && (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <p className="text-sm font-medium text-amber-900">
              Column mismatches — map to columns in the new file
            </p>
            {issues.map((issue) => (
              <div key={`${issue.slideIndex}-${issue.field}-${issue.expected}`}>
                <Label className="text-xs text-muted-foreground">
                  Slide {issue.slideIndex + 1}: {issue.expected}
                </Label>
                <Select
                  value={columnMappings[issue.expected] ?? ""}
                  onValueChange={(v) => handleMappingChange(issue.expected, v)}
                >
                  <SelectTrigger className="mt-1 h-8">
                    <SelectValue placeholder="Select column…" />
                  </SelectTrigger>
                  <SelectContent>
                    {issue.suggestions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        {data && issues.length === 0 && (
          <p className="text-sm text-green-700">
            All columns matched — ready to generate.
          </p>
        )}

        <ActionButton
          className="w-full"
          disabled={!data || busy || issues.length > 0}
          loading={busy || createDeck.isPending}
          loadingText="Generating…"
          onClick={startCreateDeck}
        >
          Generate deck
        </ActionButton>
      </DialogContent>
    </Dialog>
    </>
  );
}
