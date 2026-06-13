"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createTemplateFromDeck } from "@/lib/apply-template";
import { saveTemplate } from "@/lib/template-storage";
import type { SavedTemplateKind } from "@/lib/templates/saved-template";
import type { StoredDeck } from "@/lib/types";

interface SaveTemplateDialogProps {
  deck: StoredDeck;
  compact?: boolean;
}

export function SaveTemplateDialog({
  deck,
  compact = false,
}: SaveTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(deck.manifest.title || "My template");
  const [kind, setKind] = useState<SavedTemplateKind>(
    deck.data ? "weekly_report" : "skeleton"
  );
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter a template name.");
      return;
    }
    if (kind === "weekly_report" && !deck.data) {
      toast.error("Weekly Report templates need a data file on the deck.");
      return;
    }
    setSaving(true);
    try {
      const templateKind = kind === "weekly_report" ? "weekly_report" : "skeleton";
      const template = createTemplateFromDeck(deck, trimmed, templateKind);
      saveTemplate(template);
      toast.success("Template saved — find it under Templates → My templates");
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save template."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Save as template"
            aria-label="Save as template"
          >
            <BookmarkPlus className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <BookmarkPlus className="mr-1.5 h-3.5 w-3.5" /> Save as template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Reuse this deck structure with new data — same slide order, chart types,
            and titles.
          </p>
          <div>
            <Label htmlFor="template-name">Template name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2"
              placeholder="e.g. March QBR"
            />
          </div>
          <div>
            <Label htmlFor="template-kind">Kind</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as SavedTemplateKind)}
            >
              <SelectTrigger id="template-kind" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly_report">
                  Weekly Report — rebind charts/tables to new file
                </SelectItem>
                <SelectItem value="skeleton">
                  Deck skeleton — structure only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
