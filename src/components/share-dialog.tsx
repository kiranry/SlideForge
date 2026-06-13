"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Link2, Loader2, Trash2 } from "lucide-react";
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
import { loadDeck } from "@/lib/storage";
import {
  addOwnerShare,
  listOwnerShares,
  removeOwnerShare,
} from "@/lib/owner-shares";
import type { OwnerShareMeta } from "@/lib/share-types";

interface ShareDialogProps {
  deckId: string;
  compact?: boolean;
}

export function ShareDialog({ deckId, compact = false }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [allowDownload, setAllowDownload] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState<string>("7");
  const [shares, setShares] = useState<OwnerShareMeta[]>(
    () => listOwnerShares(deckId)
  );
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const refreshShares = () => setShares(listOwnerShares(deckId));

  const createShare = useMutation({
    mutationFn: async () => {
      const deck = await loadDeck(deckId);
      if (!deck) throw new Error("Deck not found.");

      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerDeckId: deck.id,
          deckTitle: deck.manifest.title,
          allowDownload,
          expiresInDays:
            expiresInDays === "never" ? null : Number(expiresInDays),
          snapshot: {
            manifest: deck.manifest,
            data: deck.data,
            customTheme: deck.customTheme,
            logoDataUrl: deck.logoDataUrl,
            logoOnAllSlides: deck.logoOnAllSlides,
            anomalyFlags: deck.anomalyFlags,
            suppressedAnomalyIds: deck.suppressedAnomalyIds,
          },
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Could not create share link.");
      }
      const json = (await res.json()) as {
        token: string;
        url: string;
        expiresAt: string | null;
        allowDownload: boolean;
      };
      return { ...json, deckTitle: deck.manifest.title };
    },
    onSuccess: (data) => {
      addOwnerShare({
        token: data.token,
        deckId,
        deckTitle: data.deckTitle,
        createdAt: new Date().toISOString(),
        expiresAt: data.expiresAt,
        allowDownload: data.allowDownload,
      });
      refreshShares();
      setLastUrl(data.url);
      toast.success("Share link created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revoke = useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch(`/api/share/${token}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Could not revoke link.");
      }
      removeOwnerShare(token);
      refreshShares();
    },
    onSuccess: () => toast.success("Share link revoked"),
    onError: (err: Error) => toast.error(err.message),
  });

  const copyUrl = async (url: string) => {
    const full =
      url.startsWith("http") ? url : `${window.location.origin}${url}`;
    await navigator.clipboard.writeText(full);
    toast.success("Link copied");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) refreshShares();
      }}
    >
      <DialogTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Share"
            aria-label="Share"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Link2 className="mr-1.5 h-3.5 w-3.5" /> Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share read-only link</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Anyone with the link can view the deck. No account required.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Expires</Label>
            <Select value={expiresInDays} onValueChange={setExpiresInDays}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(e) => setAllowDownload(e.target.checked)}
              />
              Allow PowerPoint download
            </label>
          </div>
        </div>

        <Button
          className="w-full"
          disabled={createShare.isPending}
          onClick={() => createShare.mutate()}
        >
          {createShare.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="mr-2 h-4 w-4" />
          )}
          Create link
        </Button>

        {lastUrl && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
            <code className="min-w-0 flex-1 truncate text-xs">{lastUrl}</code>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => copyUrl(lastUrl)}
              aria-label="Copy link"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}

        {shares.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Active links for this deck
            </p>
            {shares.map((s) => (
              <div
                key={s.token}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{s.token}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.expiresAt
                      ? `Expires ${new Date(s.expiresAt).toLocaleDateString()}`
                      : "No expiry"}
                    {s.allowDownload ? " · download OK" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      copyUrl(`/share/${s.token}`)
                    }
                    aria-label="Copy link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(s.token)}
                    aria-label="Revoke link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
