"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SlideCanvas } from "@/components/slide-canvas";
import { SlideFilmstrip } from "@/components/slide-filmstrip";
import { ensureRasterLogo } from "@/lib/logo-rasterize";
import { CUSTOM_THEME_ID } from "@/lib/themes";
import type { ShareDeckSnapshot, SlideComment } from "@/lib/share-types";

const STAGE_MAX_WIDTH = 720;

function useElementWidth<T extends HTMLElement>(ready: boolean) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    if (!ready) return;
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  return { ref, width };
}

interface ShareViewerProps {
  token: string;
  deckTitle: string;
  allowDownload: boolean;
  snapshot: ShareDeckSnapshot;
  initialComments: SlideComment[];
}

export function ShareViewer({
  token,
  deckTitle,
  allowDownload,
  snapshot,
  initialComments,
}: ShareViewerProps) {
  const [current, setCurrent] = useState(0);
  const [comments, setComments] = useState(initialComments);
  const [commentText, setCommentText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const { ref, width } = useElementWidth<HTMLDivElement>(true);

  const { manifest } = snapshot;
  const slides = manifest.slides;
  const slide = slides[Math.min(current, slides.length - 1)];

  useEffect(() => {
    const saved = localStorage.getItem("slideforge:viewer-name");
    if (saved) setAuthorName(saved);
  }, []);

  const slideComments = comments.filter((c) => c.slideIndex === current);

  const postComment = useMutation({
    mutationFn: async () => {
      const text = commentText.trim();
      if (!text) throw new Error("Enter a comment.");
      const author = authorName.trim() || "Viewer";
      localStorage.setItem("slideforge:viewer-name", author);
      const res = await fetch(`/api/share/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideIndex: current,
          text,
          author,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Could not post comment.");
      }
      const { comments: updated } = (await res.json()) as {
        comments: SlideComment[];
      };
      return updated;
    },
    onSuccess: (updated) => {
      setComments(updated);
      setCommentText("");
      toast.success("Comment posted — visible to deck owner");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const downloadPptx = useMutation({
    mutationFn: async () => {
      const logoDataUrl = await ensureRasterLogo(snapshot.logoDataUrl);
      const res = await fetch("/api/generate-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manifest: snapshot.manifest,
          data: snapshot.data,
          customTheme: snapshot.customTheme,
          logoDataUrl,
          logoOnAllSlides: snapshot.logoOnAllSlides,
          anomalyFlags: snapshot.anomalyFlags,
          suppressedAnomalyIds: snapshot.suppressedAnomalyIds,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Export failed");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="(.+?)"/);
      saveAs(blob, match?.[1] || "slideforge-deck.pptx");
    },
    onSuccess: () => toast.success("PowerPoint downloaded"),
    onError: (err: Error) => toast.error(err.message),
  });

  const cp = {
    customPalette:
      manifest.theme === CUSTOM_THEME_ID ? snapshot.customTheme : undefined,
    logoDataUrl: snapshot.logoDataUrl,
  };

  return (
    <div className="grid gap-4 touch-manipulation lg:grid-cols-[156px_1fr] lg:gap-6">
      <aside className="order-2 lg:order-1">
        <SlideFilmstrip
          slides={slides}
          current={current}
          themeId={manifest.theme}
          data={snapshot.data}
          rtl={manifest.rtl}
          anomalyFlags={snapshot.anomalyFlags}
          suppressedAnomalyIds={snapshot.suppressedAnomalyIds}
          customPalette={cp.customPalette}
          logoDataUrl={cp.logoDataUrl}
          onSelect={setCurrent}
          readOnly
        />
      </aside>

      <section className="order-1 lg:order-2">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {deckTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              Read-only share · {slides.length} slides
            </p>
          </div>
          {allowDownload && (
            <Button
              size="sm"
              disabled={downloadPptx.isPending}
              onClick={() => downloadPptx.mutate()}
            >
              {downloadPptx.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download .pptx
            </Button>
          )}
        </div>

        <div
          ref={ref}
          className="mx-auto w-full max-w-[720px] overflow-hidden rounded-xl border border-border shadow-lg"
          style={{ background: "#fff" }}
        >
          <SlideCanvas
            slide={slide}
            themeId={manifest.theme}
            data={snapshot.data}
            width={width > 0 ? width : STAGE_MAX_WIDTH}
            rtl={manifest.rtl}
            anomalyFlags={snapshot.anomalyFlags}
            suppressedAnomalyIds={snapshot.suppressedAnomalyIds}
            {...cp}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            className="min-h-10 px-3"
            disabled={current === 0}
            onClick={() => setCurrent((c) => c - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="font-mono text-sm text-muted-foreground">
            {current + 1} / {slides.length}
          </span>
          <Button
            variant="outline"
            className="min-h-10 px-3"
            disabled={current >= slides.length - 1}
            onClick={() => setCurrent((c) => c + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <h2 className="text-sm font-medium">
              Comments on slide {current + 1}
            </h2>
          </div>

          {slideComments.length > 0 && (
            <ul className="mb-3 space-y-2">
              {slideComments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <p className="font-medium">{c.author}</p>
                  <p className="text-muted-foreground">{c.text}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="viewer-name" className="text-xs">Your name</Label>
              <Input
                id="viewer-name"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Optional"
                className="mt-1 h-9"
              />
            </div>
          </div>
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Leave feedback for the presenter…"
            className="mt-2 min-h-[80px] text-sm"
            aria-label="Comment text"
          />
          <Button
            type="button"
            size="sm"
            className="mt-2"
            disabled={!commentText.trim() || postComment.isPending}
            onClick={() => postComment.mutate()}
          >
            {postComment.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Post comment
          </Button>
        </div>
      </section>
    </div>
  );
}
