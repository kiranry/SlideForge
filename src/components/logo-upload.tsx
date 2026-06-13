"use client";

import { useRef } from "react";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useBuilderStore } from "@/lib/store";
import { isSvgDataUrl, rasterizeSvgToPng } from "@/lib/logo-rasterize";

const MAX_BYTES = 2 * 1024 * 1024;

export function LogoUpload() {
  const store = useBuilderStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      alert("Logo must be under 2 MB.");
      return;
    }
    if (!/\.(png|jpg|jpeg|svg)$/i.test(file.name)) {
      alert("Use PNG, JPEG, or SVG.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      if (isSvgDataUrl(dataUrl)) {
        try {
          store.setLogoDataUrl(await rasterizeSvgToPng(dataUrl));
        } catch {
          alert("Could not process SVG logo. Try PNG or JPEG.");
        }
      } else {
        store.setLogoDataUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <Label>Logo (optional)</Label>
      <p className="text-xs text-muted-foreground">
        Placed on the title slide. PNG, JPEG, or SVG (converted for export), max 2 MB.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {store.logoDataUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-border p-2">
          <img
            src={store.logoDataUrl}
            alt="Logo preview"
            className="h-10 max-w-[120px] object-contain"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              store.setLogoDataUrl(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="mr-2 h-4 w-4" /> Upload logo
        </Button>
      )}
      {store.logoDataUrl && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={store.logoOnAllSlides}
            onChange={(e) => store.setLogoOnAllSlides(e.target.checked)}
          />
          Show logo on every slide footer
        </label>
      )}
    </div>
  );
}
