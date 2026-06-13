"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ListCardsSkeleton } from "@/components/loading-states";
import { validateCustomPalette } from "@/lib/contrast";
import { defaultBrandKit, type BrandKit } from "@/lib/brand-kit";
import {
  deleteBrandKit,
  listBrandKits,
  saveBrandKit,
} from "@/lib/brand-kit-storage";
import { SAFE_PPTX_FONTS } from "@/lib/fonts";
import { withHash } from "@/lib/themes";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function normalizeHex(v: string): string {
  return v.replace(/^#/, "").trim().toUpperCase();
}

export default function BrandKitsPage() {
  const [kits, setKits] = useState<BrandKit[] | null>(null);
  const [editing, setEditing] = useState<BrandKit | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setKits(listBrandKits());
  }, []);

  const startNew = () => {
    setEditing(defaultBrandKit("New brand kit"));
  };

  const startEdit = (kit: BrandKit) => {
    setEditing({ ...kit, palette: { ...kit.palette } });
  };

  const save = () => {
    if (!editing) return;
    const validation = validateCustomPalette(
      editing.palette.primary,
      editing.palette.secondary,
      editing.palette.accent
    );
    if (!validation.ok) {
      toast.error(validation.errors[0] ?? "Invalid palette.");
      return;
    }
    saveBrandKit(editing);
    setKits(listBrandKits());
    toast.success("Brand kit saved");
    setEditing(null);
  };

  const remove = (id: string) => {
    deleteBrandKit(id);
    setKits(listBrandKits());
    if (editing?.id === id) setEditing(null);
    toast.success("Brand kit deleted");
  };

  const patchEditing = (patch: Partial<BrandKit>) => {
    if (!editing) return;
    setEditing({ ...editing, ...patch });
  };

  const handleLogo = (file: File | undefined) => {
    if (!file || !editing) return;
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo must be under 2 MB.");
      return;
    }
    setLogoLoading(true);
    const reader = new FileReader();
    reader.onload = () =>
      patchEditing({ logoDataUrl: reader.result as string });
    reader.onerror = () => toast.error("Could not read logo file.");
    reader.onloadend = () => setLogoLoading(false);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              Brand kits
            </h1>
            <p className="mt-2 text-muted-foreground">
              Reuse colors, fonts, chart palette, and logo across decks without
              re-uploading each time.
            </p>
          </div>
          <Button onClick={startNew}>
            <Plus className="mr-2 h-4 w-4" /> New kit
          </Button>
        </header>

        {kits === null ? (
          <ListCardsSkeleton count={3} />
        ) : kits.length === 0 && !editing ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No brand kits yet. Create one to standardize your decks.
            </CardContent>
          </Card>
        ) : null}

        {kits !== null && kits.length > 0 ? (
        <ul className="mb-8 space-y-3">
          {kits.map((kit) => (
            <li
              key={kit.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[kit.palette.primary, kit.palette.secondary, kit.palette.accent].map(
                    (c) => (
                      <span
                        key={c}
                        className="h-6 w-6 rounded-full border border-black/10"
                        style={{ background: withHash(c) }}
                      />
                    )
                  )}
                </div>
                <div>
                  <p className="font-medium">{kit.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {kit.headingFont ?? "Calibri"} / {kit.bodyFont ?? "Calibri"}
                    {kit.logoDataUrl ? " · logo" : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => startEdit(kit)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(kit.id)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
        ) : null}

        {editing && (
          <Card>
            <CardHeader>
              <CardTitle>{editing.id ? "Edit brand kit" : "New brand kit"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => patchEditing({ name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {(["primary", "secondary", "accent"] as const).map((key) => (
                  <div key={key}>
                    <Label className="capitalize">{key}</Label>
                    <Input
                      value={editing.palette[key]}
                      onChange={(e) =>
                        patchEditing({
                          palette: {
                            ...editing.palette,
                            [key]: normalizeHex(e.target.value),
                          },
                        })
                      }
                      className="mt-1 font-mono"
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Heading font</Label>
                  <Select
                    value={editing.headingFont ?? "Calibri"}
                    onValueChange={(v) => patchEditing({ headingFont: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SAFE_PPTX_FONTS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Body font</Label>
                  <Select
                    value={editing.bodyFont ?? "Calibri"}
                    onValueChange={(v) => patchEditing({ bodyFont: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SAFE_PPTX_FONTS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Chart colors (hex, comma-separated)</Label>
                <Input
                  value={(editing.chartColors ?? []).join(", ")}
                  onChange={(e) =>
                    patchEditing({
                      chartColors: e.target.value
                        .split(/[,\s]+/)
                        .map(normalizeHex)
                        .filter(Boolean),
                    })
                  }
                  placeholder="1E2761, CADCFC, 4A6FA5"
                  className="mt-1 font-mono text-sm"
                />
              </div>

              <div>
                <Label>Logo</Label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  className="hidden"
                  onChange={(e) => handleLogo(e.target.files?.[0])}
                />
                <div className="mt-2 flex items-center gap-3">
                  {editing.logoDataUrl && (
                    <img
                      src={editing.logoDataUrl}
                      alt=""
                      className="h-10 max-w-[120px] object-contain"
                    />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={logoLoading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoLoading ? (
                      <>
                        <Spinner size="sm" /> Uploading…
                      </>
                    ) : (
                      "Upload logo"
                    )}
                  </Button>
                  {editing.logoDataUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => patchEditing({ logoDataUrl: null })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.logoOnAllSlides ?? false}
                    onChange={(e) =>
                      patchEditing({ logoOnAllSlides: e.target.checked })
                    }
                  />
                  Logo on every slide footer
                </label>
              </div>

              <div className="flex gap-2">
                <Button onClick={save}>Save kit</Button>
                <Button variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link href="/create" className="text-primary underline-offset-4 hover:underline">
            Back to builder
          </Link>
        </p>
      </main>
    </div>
  );
}
