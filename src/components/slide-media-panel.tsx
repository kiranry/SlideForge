"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { compressImageFile } from "@/lib/compress-image";
import { clearElementBox } from "@/lib/element-boxes";
import { removeSlideImageFromStore } from "@/lib/deck-media";
import { IMAGE_PRESETS } from "@/lib/slide-images";
import type { Slide, SlideImage } from "@/lib/types";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface SlideMediaPanelProps {
  slide: Slide;
  deckId: string;
  onSlideChange: (slide: Slide) => void;
  embedded?: boolean;
}

/** Per-slide image upload, AI generation, and placement (Phase 6). */
export function SlideMediaPanel({
  slide,
  deckId,
  onSlideChange,
  embedded = false,
}: SlideMediaPanelProps) {
  const shell = embedded
    ? "border-b border-border px-4 py-3 space-y-3"
    : "mt-4 space-y-4 rounded-lg border border-border bg-muted/20 p-4";
  const labelClass = embedded
    ? "text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
    : "font-mono text-xs uppercase tracking-wider text-muted-foreground";
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [compressing, setCompressing] = useState(false);

  const replacingAi = slide.image?.source === "ai";

  const imageStatus = useQuery({
    queryKey: ["generate-image-status"],
    queryFn: async () => {
      const res = await fetch("/api/generate-image/status");
      if (!res.ok) throw new Error("Could not load image provider status");
      return res.json() as Promise<{
        available: boolean;
        hint: string;
      }>;
    },
    staleTime: 60_000,
  });

  const applyImage = (
    dataUrl: string,
    placement: SlideImage["placement"],
    source: SlideImage["source"],
    prompt?: string
  ) => {
    const patch: Partial<Slide> = {
      image: {
        source,
        dataUrl,
        placement,
        prompt: source === "ai" ? prompt : undefined,
      },
    };
    if (placement === "hero") {
      patch.layout_hint = "full_bleed";
    }
    onSlideChange({ ...slide, ...patch });
  };

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    if (!/\.(png|jpg|jpeg|webp)$/i.test(file.name)) {
      toast.error("Use PNG, JPEG, or WebP.");
      return;
    }
    try {
      setCompressing(true);
      const dataUrl = await compressImageFile(file);
      applyImage(dataUrl, slide.image?.placement ?? "right", "upload");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not add image."
      );
    } finally {
      setCompressing(false);
    }
  };

  const generateImage = useMutation({
    mutationFn: async (opts: {
      prompt: string;
      preset?: (typeof IMAGE_PRESETS)[number]["id"];
      aspectRatio?: "16:9" | "1:1" | "4:3";
      placement?: SlideImage["placement"];
    }) => {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: opts.prompt,
          slideTitle: slide.title,
          slideBody: slide.body,
          preset: opts.preset,
          aspectRatio: opts.aspectRatio,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Image generation failed");
      }
      return res.json() as Promise<{
        dataUrl: string;
        prompt: string;
        provider?: string;
      }>;
    },
    onSuccess: (result, vars) => {
      const preset = IMAGE_PRESETS.find((p) => p.id === vars.preset);
      const placement =
        vars.placement ?? preset?.defaultPlacement ?? slide.image?.placement ?? "right";
      applyImage(result.dataUrl, placement, "ai", result.prompt);
      const via =
        result.provider === "huggingface"
          ? " (via Hugging Face)"
          : result.provider === "pollinations"
            ? " (via Pollinations)"
            : "";
      toast.success(`AI image generated${via}`);
    },
    onError: (err: Error) => {
      toast.error(err.message, { duration: 8000 });
    },
  });

  const aiGenerateDisabled =
    generateImage.isPending || imageStatus.data?.available === false;

  const removeImage = async () => {
    if (slide.image) {
      try {
        await removeSlideImageFromStore(deckId, slide.index - 1, slide.image);
      } catch {
        /* non-fatal */
      }
    }
    onSlideChange({ ...slide, image: null });
  };

  const setImagePlacement = (placement: SlideImage["placement"]) => {
    if (!slide.image) return;
    const patch: Partial<Slide> = {
      image: { ...slide.image, placement },
    };
    if (placement === "hero") patch.layout_hint = "full_bleed";
    onSlideChange(clearElementBox({ ...slide, ...patch }, "image"));
  };

  const runGenerate = (preset?: (typeof IMAGE_PRESETS)[number]["id"]) => {
    const prompt = imagePrompt.trim() || slide.title;
    if (prompt.length < 3) {
      toast.error("Enter a prompt (at least 3 characters) or use a preset.");
      return;
    }
    const presetMeta = IMAGE_PRESETS.find((p) => p.id === preset);
    generateImage.mutate({
      prompt,
      preset,
      aspectRatio: presetMeta?.aspectRatio,
      placement: presetMeta?.defaultPlacement,
    });
  };

  return (
    <div className={shell}>
      <p className={labelClass}>Image</p>

      {/* AI generation */}
      <div
        className={
          embedded
            ? "space-y-2"
            : "space-y-2 rounded-md border border-dashed border-border bg-background/60 p-3"
        }
      >
        {!embedded && (
          <Label htmlFor="slide-image-prompt" className="text-sm font-medium">
            Generate with AI
          </Label>
        )}
        <Input
          id="slide-image-prompt"
          value={imagePrompt}
          onChange={(e) => setImagePrompt(e.target.value)}
          placeholder={`Describe an image for "${slide.title}"…`}
          className="h-9"
          disabled={generateImage.isPending}
          aria-label="AI image prompt"
        />
        <div className="flex flex-wrap gap-1.5">
          {IMAGE_PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={aiGenerateDisabled}
              onClick={() => runGenerate(p.id)}
            >
              {embedded ? p.label.split(" ")[0] : p.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            disabled={aiGenerateDisabled || imagePrompt.trim().length < 3}
            onClick={() => runGenerate()}
          >
            {generateImage.isPending ? (
              <Spinner size="sm" className="gap-0" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            Generate
          </Button>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {replacingAi && "Regenerating replaces this slide's AI image. "}
          {!embedded &&
            (imageStatus.isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <Skeleton className="inline-block h-3 w-48" />
              </span>
            ) : (
              imageStatus.data?.hint ??
              "Free Google keys cannot generate images — add HUGGINGFACE_API_KEY or upload a file."
            ))}
        </p>
      </div>

      {/* Current image / upload */}
      <div className="space-y-2">
        {slide.image?.dataUrl ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <img
                src={slide.image.dataUrl}
                alt={slide.image.alt ?? ""}
                className="h-16 max-w-[140px] rounded border border-border object-contain bg-white p-1"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <Select
                  value={slide.image.placement}
                  onValueChange={(v) =>
                    setImagePlacement(v as SlideImage["placement"])
                  }
                >
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Right rail</SelectItem>
                    <SelectItem value="inline">Inline</SelectItem>
                    <SelectItem value="hero">Hero</SelectItem>
                  </SelectContent>
                </Select>
                {slide.image.source === "ai" && slide.image.prompt && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Prompt: {slide.image.prompt}
                  </p>
                )}
              </div>
              {slide.image.source === "ai" && slide.image.prompt && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={generateImage.isPending}
                  onClick={() =>
                    generateImage.mutate({
                      prompt: slide.image!.prompt!,
                      placement: slide.image!.placement,
                    })
                  }
                >
                  {generateImage.isPending ? (
                    <Spinner size="sm" className="gap-0" />
                  ) : (
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  )}
                  Regenerate
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={removeImage}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <input
              ref={imageInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              className="hidden"
              aria-label="Upload slide image"
              onChange={(e) => handleImageFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={compressing}
              onClick={() => imageInputRef.current?.click()}
            >
              {compressing ? (
                <>
                  <Spinner size="sm" className="gap-0" /> Compressing…
                </>
              ) : (
                <>
                  <ImagePlus className="mr-1.5 h-3.5 w-3.5" /> Upload image
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
