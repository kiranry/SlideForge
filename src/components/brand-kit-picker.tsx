"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyBrandKitToBuilder } from "@/lib/apply-brand-kit";
import type { BrandKit } from "@/lib/brand-kit";
import {
  getLastUsedBrandKit,
  listBrandKits,
} from "@/lib/brand-kit-storage";
import { useBuilderStore } from "@/lib/store";

export function BrandKitPicker() {
  const store = useBuilderStore();
  const [kits, setKits] = useState<BrandKit[]>([]);
  const [selected, setSelected] = useState<string>(
    store.brandKitId ?? "none"
  );

  useEffect(() => {
    setKits(listBrandKits());
    const last = getLastUsedBrandKit();
    if (last && !store.brandKitId) {
      applyBrandKitToBuilder(last);
      setSelected(last.id);
    }
  }, [store.brandKitId]);

  const apply = (kitId: string) => {
    if (kitId === "none") {
      store.setBrandKitId(null);
      setSelected("none");
      return;
    }
    const kit = kits.find((k) => k.id === kitId);
    if (!kit) return;
    applyBrandKitToBuilder(kit);
    setSelected(kitId);
    toast.success(`Applied brand kit “${kit.name}”`);
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Palette className="h-3.5 w-3.5" /> Brand kit
      </Label>
      {kits.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Save colors, fonts, logo, and chart palette once — reuse on every deck.{" "}
          <Link href="/brand-kits" className="text-primary underline-offset-4 hover:underline">
            Create a brand kit
          </Link>
        </p>
      ) : (
        <>
          <Select value={selected} onValueChange={apply}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select brand kit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No brand kit</SelectItem>
              {kits.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="link" size="sm" className="h-auto px-0" asChild>
            <Link href="/brand-kits">Manage brand kits</Link>
          </Button>
        </>
      )}
    </div>
  );
}
