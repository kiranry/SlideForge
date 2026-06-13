"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { ShareViewer } from "@/components/share-viewer";
import { PageLoading } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import type { ShareRecord } from "@/lib/share-types";

export default function SharePage({ params }: { params: { token: string } }) {
  const [share, setShare] = useState<ShareRecord | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/share/${params.token}`);
      if (cancelled) return;
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "Not found" }));
        setError(msg ?? "Share link not found or expired.");
        setShare(null);
        return;
      }
      const { share: record } = (await res.json()) as { share: ShareRecord };
      setShare(record);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  if (share === undefined) {
    return <PageLoading label="Loading shared deck…" className="min-h-screen" />;
  }

  if (!share || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">{error ?? "Share link unavailable."}</p>
        <Button asChild variant="outline">
          <Link href="/">Go to SlideForge</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Layers className="h-3.5 w-3.5" />
            </span>
            <span className="font-display text-lg font-semibold">SlideForge</span>
          </Link>
          <span className="text-xs text-muted-foreground">Shared deck</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <ShareViewer
          token={params.token}
          deckTitle={share.deckTitle}
          allowDownload={share.allowDownload}
          snapshot={share.snapshot}
          initialComments={share.comments}
        />
      </main>
    </div>
  );
}
