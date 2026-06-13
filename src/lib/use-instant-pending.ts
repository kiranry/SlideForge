"use client";

import { useCallback, useEffect, useState } from "react";

/** True immediately on trigger, until external pending settles false. */
export function useInstantPending(externalPending = false) {
  const [localPending, setLocalPending] = useState(false);
  const pending = localPending || externalPending;

  useEffect(() => {
    if (!externalPending) setLocalPending(false);
  }, [externalPending]);

  const run = useCallback((action: () => void) => {
    setLocalPending(true);
    action();
  }, []);

  const reset = useCallback(() => setLocalPending(false), []);

  return { pending, run, reset };
}

export type BusyPhase = "idle" | "working" | "redirecting";

/** Keeps UI busy through async work and client navigation. */
export function useBusyPhase() {
  const [phase, setPhase] = useState<BusyPhase>("idle");
  const busy = phase !== "idle";

  const start = useCallback(() => setPhase("working"), []);
  const redirect = useCallback(() => setPhase("redirecting"), []);
  const reset = useCallback(() => setPhase("idle"), []);

  return { phase, busy, start, redirect, reset, setPhase };
}
