"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { validateCustomPalette } from "@/lib/contrast";
import { CUSTOM_THEME_ID, withHash } from "@/lib/themes";
import { useBuilderStore } from "@/lib/store";
import type { CustomThemePalette } from "@/lib/types";

function normalizeHex(v: string): string {
  return v.replace(/^#/, "").trim().toUpperCase();
}

export function CustomThemePicker() {
  const store = useBuilderStore();
  const active = store.themeId === CUSTOM_THEME_ID;
  const [primary, setPrimary] = useState(store.customTheme?.primary ?? "1E2761");
  const [secondary, setSecondary] = useState(store.customTheme?.secondary ?? "CADCFC");
  const [accent, setAccent] = useState(store.customTheme?.accent ?? "FFFFFF");
  const validation = validateCustomPalette(primary, secondary, accent);

  const apply = () => {
    const palette: CustomThemePalette = {
      primary: normalizeHex(primary),
      secondary: normalizeHex(secondary),
      accent: normalizeHex(accent),
    };
    store.setCustomTheme(palette);
  };

  return (
    <div
      className={`rounded-lg border p-3 ${
        active ? "border-primary ring-1 ring-primary" : "border-border"
      }`}
    >
      <button
        type="button"
        className="mb-3 flex w-full items-center gap-2 text-left text-sm font-medium"
        onClick={() => {
          if (!active) apply();
          else store.setThemeId(CUSTOM_THEME_ID);
        }}
      >
        <span className="flex gap-1">
          {[primary, secondary, accent].map((c) => (
            <span
              key={c}
              className="h-4 w-4 rounded-full border border-black/10"
              style={{ background: withHash(normalizeHex(c)) }}
            />
          ))}
        </span>
        Custom theme
      </button>

      {active && (
        <div className="space-y-3">
          {(["primary", "secondary", "accent"] as const).map((key) => {
            const val = key === "primary" ? primary : key === "secondary" ? secondary : accent;
            const set =
              key === "primary" ? setPrimary : key === "secondary" ? setSecondary : setAccent;
            return (
              <div key={key}>
                <Label className="text-xs capitalize">{key}</Label>
                <Input
                  value={val}
                  onChange={(e) => set(normalizeHex(e.target.value))}
                  placeholder="RRGGBB"
                  className="mt-1 font-mono text-sm"
                  maxLength={7}
                />
              </div>
            );
          })}
          {!validation.ok && (
            <ul className="text-xs text-destructive">
              {validation.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {validation.ok && (
            <p className="text-xs text-muted-foreground">Passes WCAG AA contrast checks.</p>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full"
            disabled={!validation.ok}
            onClick={apply}
          >
            Apply custom theme
          </Button>
        </div>
      )}
    </div>
  );
}
