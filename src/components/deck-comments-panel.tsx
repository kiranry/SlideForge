"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { listOwnerShares } from "@/lib/owner-shares";
import type { SlideComment } from "@/lib/share-types";
import type { StoredDeck } from "@/lib/types";

interface DeckCommentsPanelProps {
  deck: StoredDeck;
  currentSlideIndex: number;
  onCommentsChange: (comments: SlideComment[]) => void;
}

type ShareComment = SlideComment & { shareToken: string };

export function DeckCommentsPanel({
  deck,
  currentSlideIndex,
  onCommentsChange,
}: DeckCommentsPanelProps) {
  const [shareComments, setShareComments] = useState<ShareComment[]>([]);
  const [note, setNote] = useState("");
  const localComments = deck.comments ?? [];

  useEffect(() => {
    const tokens = listOwnerShares(deck.id).map((s) => s.token);
    if (!tokens.length) {
      setShareComments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/share/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens }),
      });
      if (!res.ok || cancelled) return;
      const { shares } = (await res.json()) as {
        shares: Array<{ token: string; comments: SlideComment[] }>;
      };
      const merged: ShareComment[] = [];
      for (const s of shares) {
        for (const c of s.comments) {
          merged.push({ ...c, shareToken: s.token });
        }
      }
      if (!cancelled) setShareComments(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [deck.id]);

  const slideLocal = localComments.filter((c) => c.slideIndex === currentSlideIndex);
  const slideShare = shareComments.filter(
    (c) => c.slideIndex === currentSlideIndex
  );

  const addNote = () => {
    const text = note.trim();
    if (!text) return;
    const comment: SlideComment = {
      id: crypto.randomUUID(),
      slideIndex: currentSlideIndex,
      text,
      author: "You",
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    onCommentsChange([...localComments, comment]);
    setNote("");
    toast.success("Note added");
  };

  const resolveShare = useMutation({
    mutationFn: async ({
      token,
      commentId,
      resolved,
    }: {
      token: string;
      commentId: string;
      resolved: boolean;
    }) => {
      const res = await fetch(`/api/share/${token}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, resolved }),
      });
      if (!res.ok) throw new Error("Could not update comment.");
      return res.json();
    },
    onSuccess: () => {
      const tokens = listOwnerShares(deck.id).map((s) => s.token);
      fetch("/api/share/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens }),
      })
        .then((r) => r.json())
        .then((data) => {
          const merged: ShareComment[] = [];
          for (const s of data.shares ?? []) {
            for (const c of s.comments) {
              merged.push({ ...c, shareToken: s.token });
            }
          }
          setShareComments(merged);
        })
        .catch(() => {});
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resolveLocal = (id: string) => {
    onCommentsChange(
      localComments.map((c) =>
        c.id === id ? { ...c, resolved: true } : c
      )
    );
  };

  if (
    slideLocal.length === 0 &&
    slideShare.length === 0 &&
    !listOwnerShares(deck.id).length
  ) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Comments on slide {currentSlideIndex + 1}</h3>
      </div>

      <div className="mb-3 space-y-2">
        {slideShare.map((c) => (
          <div
            key={`${c.shareToken}-${c.id}`}
            className={`rounded-md border px-3 py-2 text-sm ${
              c.resolved ? "border-border/50 opacity-60" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-foreground">{c.author}</p>
              {c.resolved ? (
                <Badge variant="secondary" className="text-xs">Resolved</Badge>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={resolveShare.isPending}
                  onClick={() =>
                    resolveShare.mutate({
                      token: c.shareToken,
                      commentId: c.id,
                      resolved: true,
                    })
                  }
                >
                  <Check className="mr-1 h-3 w-3" /> Resolve
                </Button>
              )}
            </div>
            <p className="mt-1 text-muted-foreground">{c.text}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              From share link · {new Date(c.createdAt).toLocaleString()}
            </p>
          </div>
        ))}

        {slideLocal.map((c) => (
          <div
            key={c.id}
            className={`rounded-md border px-3 py-2 text-sm ${
              c.resolved ? "border-border/50 opacity-60" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{c.author}</p>
              {!c.resolved && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => resolveLocal(c.id)}
                >
                  <Check className="mr-1 h-3 w-3" /> Resolve
                </Button>
              )}
            </div>
            <p className="mt-1 text-muted-foreground">{c.text}</p>
          </div>
        ))}
      </div>

      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add an owner note on this slide…"
        className="min-h-[60px] text-sm"
        aria-label="Owner comment"
      />
      <Button
        type="button"
        size="sm"
        className="mt-2"
        disabled={!note.trim()}
        onClick={addNote}
      >
        Add note
      </Button>
    </div>
  );
}
