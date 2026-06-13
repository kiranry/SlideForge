"use client";

import { AlertTriangle, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnomalyFlag } from "@/lib/types";

interface AnomalyPanelProps {
  flags: AnomalyFlag[];
  suppressed: string[];
  onSuppress: (id: string) => void;
  onRestore: (id: string) => void;
}

export function AnomalyPanel({
  flags,
  suppressed,
  onSuppress,
  onRestore,
}: AnomalyPanelProps) {
  if (flags.length === 0) return null;

  const active = flags.filter((f) => !suppressed.includes(f.id));
  const hidden = flags.filter((f) => suppressed.includes(f.id));

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        Data anomalies ({active.length} flagged)
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Statistical outliers and dips detected in your data. Suppress flags you
        don&apos;t want shown on charts before export.
      </p>
      <ul className="space-y-2">
        {active.map((f) => (
          <li
            key={f.id}
            className="flex items-start justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <span>{f.message}</span>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-xs"
              onClick={() => onSuppress(f.id)}
            >
              <EyeOff className="mr-1 h-3 w-3" /> Hide
            </Button>
          </li>
        ))}
      </ul>
      {hidden.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs text-muted-foreground">Hidden ({hidden.length})</p>
          <ul className="space-y-1">
            {hidden.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{f.message}</span>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onRestore(f.id)}>
                  Show
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
