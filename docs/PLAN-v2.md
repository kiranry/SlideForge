# SlideForge — Implementation Plan v2

> Post-MVP plan: **interactive preview editing**, **AI-assisted charts**, **AI + manual images**, and **live data visibility** on chart slides. Builds on the completed v1 plan (`PLAN.md`).

**Prerequisites:** Phases 0–3 complete (outline → preview → `.pptx`, data parsing, remix, anomalies, RTL).

**Stack (unchanged):** Next.js 14, TypeScript, Tailwind, shadcn/ui, pptxgenjs, Zustand, React Query, localStorage.

**AI:** Existing provider abstraction (`AI_PROVIDER`); v2 adds **image generation** via the same provider where supported (Gemini Imagen / Anthropic — pick one primary, one fallback).

---

## v2 goals (user-facing)

1. **Type directly on slides** in preview — edit title, bullets, KPI values, table cells, quotes without opening a separate dialog or re-prompting AI.
2. **Change chart form** on any chart slide (bar → line → pie, etc.) with instant preview + export update.
3. **See the data behind charts** in preview — table of the exact rows/columns driving the current chart.
4. **AI help for charts** — suggest better chart type, axis columns, or a one-line “why this chart” rationale; optional “fix my chart” from natural language.
5. **Images on slides** — user upload per slide **and** AI-generated images placed on title/content/hero layouts.

---

## Guiding principles

- **Preview is the editor.** v1 treated preview as read-only (+ regenerate dialog). v2 makes the canvas the primary edit surface; AI augments, doesn’t replace manual edits.
- **Manifest stays the spine.** Every edit updates `StoredDeck.manifest` (and `StoredDeck.data` when chart source data changes) in localStorage — same persistence model as v1.
- **No new server state.** Images stored as data URLs in the deck (MVP) or optional IndexedDB for large assets if size becomes an issue.
- **Chart parity.** Preview chart type switch must update both Recharts preview and pptxgenjs `addChart` — reuse existing `resolveChartData` + `chart.type`.
- **Incremental delivery.** Ship inline text edit + chart type picker before AI image gen (higher risk / cost).

---

## What v1 already provides (do not rebuild)

| Capability | Location |
|--------------|----------|
| Data-driven charts (7 types) | `slide.chart`, `lib/chart-data.ts`, `lib/pptx/charts.ts`, Recharts preview |
| Chart type override at **build** time | `DataPreview` on `/create` (recommendations only) |
| Logo image | `LogoUpload` → `addImage` on title/footer |
| Insight slide text edit | `deck-preview.tsx` (insight slides only) |
| Regenerate slide via AI dialog | `/api/regenerate-slide`, `RegenerateSlideDialog` |
| Parsed data on deck | `StoredDeck.data` |

---

## Schema & type extensions

Extend `lib/schema.ts` / `lib/types.ts`:

```ts
// Per-slide optional image (upload or AI)
imageSchema = {
  source: "upload" | "ai",
  dataUrl: string,           // base64 data URL in MVP
  alt?: string,
  placement: "hero" | "right" | "background" | "inline",
  prompt?: string,           // when source === "ai"
}

// Optional inline chart overrides (preview edits without mutating source file)
chartSpecSchema += {
  // existing: type, data_ref, x_col, y_cols
  ai_rationale?: string,     // cached AI explanation
}

// Slide-level
slideSchema += {
  image?: imageSchema | null,
  // future: locked?: boolean  — skip AI remix overwriting manual edits
}
```

**StoredDeck** — no structural change required; large `image.dataUrl` values may push localStorage limits → Phase 4 mitigation.

---

## Architecture overview

```
/create ──► manifest + data ──► localStorage
                                    │
/preview/:id ◄──────────────────────┘
    │
    ├── EditableSlideCanvas (contenteditable / field overlays)
    │       └── onChange → updateDeck({ manifest })
    │
    ├── ChartToolbar (type Select, AI suggest, data toggle)
    │       └── chart.type / x_col / y_cols → manifest
    │
    ├── ChartDataPanel (table from resolveChartData + raw sheet rows)
    │
    └── ImagePanel (upload | AI generate → slide.image)

/api/suggest-chart      ── data slice + current chart → type + rationale
/api/generate-image     ── prompt + slide context → image bytes → data URL
/api/regenerate-slide   ── (existing) still for full-slide AI rewrite
```

Shared layout: extend `lib/layout.ts` with `REGIONS.imageHero`, `REGIONS.imageRight` for preview + pptx alignment.

---

## Phase 4 — Interactive preview (foundation for v2)

**Goal:** Edit slides and charts in preview without new AI calls.

### 4.1 Inline slide text editing

| Task | Detail |
|------|--------|
| `EditableSlideCanvas` | Wrap or fork `SlideCanvas`; clickable fields for `title`, `subtitle`, `body[]` bullets, KPI labels/values, quote text, comparison headings/points |
| Edit UX | Click-to-focus: `contenteditable` spans or thin overlay `Textarea`/`Input` positioned with existing `regionStyle()` |
| Persistence | Debounce 300ms → `updateDeck(id, { manifest })`; optimistic UI |
| Slide types | **v2.0:** title, content, divider, closing, kpi, quote, comparison, insight. **v2.1:** table cells, timeline items |
| Speaker notes | Keep separate notes panel below stage (already partially there); make notes editable textarea |

**Exit criteria:** User can fix a typo on slide 3 and download `.pptx` with the correction — no regenerate API call.

### 4.2 Chart type picker in preview

| Task | Detail |
|------|--------|
| `ChartToolbar` on chart slides | `Select` bound to `slide.chart.type` (same options as `CHART_TYPES`) |
| Validation | Disable types that don’t fit data (e.g. pie requires single y column) — reuse rules from `recommend-charts` heuristics |
| Live update | Changing select updates manifest → Recharts + export use new type immediately |
| Column pickers | Optional dropdowns for `x_col` / `y_cols` when deck has `data` |

**Exit criteria:** Bar chart on preview switched to line; exported `.pptx` opens with a line chart and same data.

### 4.3 Chart data panel in preview

| Task | Detail |
|------|--------|
| `ChartDataPanel` | Collapsible panel below stage or side drawer on chart slides |
| Content | Resolved labels + series values from `resolveChartData`; link to full sheet preview (paginated, max 50 rows) |
| Highlight | Rows flagged by `anomalyFlags` highlighted (reuse `anomaliesForChart`) |
| Read-only MVP | Table is view-only in 4.3; cell edit deferred to Phase 5 |

**Exit criteria:** On a chart slide, user sees the exact numbers powering the chart and which sheet/columns are used.

---

## Phase 5 — AI-assisted charts

**Goal:** AI recommends and explains charts; optional NL chart edits.

### 5.1 `/api/suggest-chart`

| Input | `data` (sheet slice), optional `currentChart`, slide `title`/`body` for context |
| Output | `{ chart_type, x_col, y_col, rationale }` — JSON only |
| Prompt | “Given columns and sample rows, best chart type and axes; if current chart is weak, say why and propose alternative.” |
| UI | “AI suggest” button on `ChartToolbar`; applies suggestion to `slide.chart` on accept |

### 5.2 Natural-language chart edit (optional stretch)

| API | Extend `/api/regenerate-slide` or new `/api/edit-chart` |
| Input | Current `chart` spec + instruction (“make this a stacked bar by region”) |
| Output | Updated `chart` object only (not full slide) — faster, cheaper |

### 5.3 AI chart rationale in UI

Cache `chart.ai_rationale` on slide after suggest; show as tooltip or subtitle under chart title in preview.

**Exit criteria:** User clicks “Suggest chart”; AI proposes pie instead of bar with one-sentence reason; accept updates preview and export.

---

## Phase 6 — Images (upload + AI)

**Goal:** Images on slides beyond deck logo.

### 6.1 Per-slide image upload

| Task | Detail |
|------|--------|
| `ImagePanel` on preview | Upload PNG/JPEG (max 5 MB per image); sets `slide.image` |
| Placements | `hero` (full-bleed or right rail), `inline` under title — start with **right rail** on content slides |
| Preview | `<img>` in `SlideCanvas` using layout regions |
| Export | `pptx.addImage({ data: dataUrl, x, y, w, h })` in `renderContent` / new `renderImageSlide` branch |
| Remove / replace | Clear `slide.image` from panel |

### 6.2 AI image generation

| Task | Detail |
|------|--------|
| `/api/generate-image` | Prompt + optional slide title/bullets as context |
| Provider | **Primary:** Gemini image model (if key supports). **Fallback:** OpenAI DALL·E or static “not configured” message |
| Output | Base64 PNG → `slide.image` with `source: "ai"`, `prompt` stored |
| UI | “Generate image” with prompt field + 2–3 presets (“abstract hero”, “icon-style illustration”, “photo realistic”) |
| Safety | Content policy errors surfaced to user; no auto-generation without user prompt |
| Cost guard | Max 3 AI images per deck session; rate limit in API |

### 6.3 AI + layout

| Task | Detail |
|------|--------|
| `layout_hint: "full_bleed"` + `image` | Hero background with title overlay |
| Regenerate image | “Regenerate” reuses stored `prompt` |

**PRD alignment:** Moves “Image generation / AI images embedded in slides” from v1 out-of-scope into v2.

**Exit criteria:** User generates an AI hero image for title slide OR uploads a product photo on a content slide; both appear in preview and `.pptx`.

---

## Phase 7 — Data editing in preview (stretch)

**Goal:** Edit source data from preview, not just view it.

| Task | Detail |
|------|--------|
| Editable `ChartDataPanel` | Inline edit cells → updates `StoredDeck.data` in memory |
| Chart refresh | Re-run `resolveChartData` on edit; anomaly re-scan optional |
| Scope limit | Single sheet, max 500 rows in deck; warn if Excel had more |
| Export | Edited data drives pptx charts (already true if `data` is updated) |

**Risk:** Edited data diverges from original upload file — show badge “Data modified in app”.

**Exit criteria:** Change March revenue from 100 to 120 in data panel; bar height updates in preview and export.

---

## Phase 8 — Polish & constraints

| Item | Action |
|------|--------|
| localStorage size | Decks with many AI images may exceed 5 MB — migrate images to IndexedDB (`lib/image-store.ts`) keyed by deck id |
| Undo/redo | Optional Zustand history stack for manifest edits (Ctrl+Z) |
| Keyboard | Tab between editable fields on slide |
| Accessibility | Editable fields need labels; chart toolbar keyboard reachable |
| Performance | Debounce manifest writes; don’t re-render full deck list on every keystroke |
| NFR | Inline edit feels instant (<100ms); AI image <15s |

---

## API summary (v2 additions)

| Route | Purpose |
|-------|---------|
| `/api/suggest-chart` | AI chart type + axes + rationale |
| `/api/edit-chart` | NL instruction → updated `chart` spec (optional) |
| `/api/generate-image` | Prompt → image data URL |

Existing routes unchanged: `generate-outline`, `generate-pptx`, `regenerate-slide`, `remix`, etc.

---

## Suggested build order

1. **Phase 4.1** — Inline text edit (highest user value, no new APIs)
2. **Phase 4.2** — Chart type picker in preview
3. **Phase 4.3** — Chart data panel (read-only)
4. **Phase 5** — AI suggest chart
5. **Phase 6.1** — Image upload per slide
6. **Phase 6.2** — AI image generation
7. **Phase 7** — Editable data grid (if needed)
8. **Phase 8** — IndexedDB images, undo, polish

---

## Risks

| Risk | Mitigation |
|------|------------|
| `contenteditable` vs layout drift | Use positioned overlays aligned to `REGIONS`, not free-form canvas |
| pptx chart type switch edge cases | Test pie/donut/scatter transitions; fallback to preview-only for unsupported combos |
| AI image cost / latency | Per-deck limits, show cost estimate, cache by prompt hash |
| localStorage quota | IndexedDB for images; compress PNG or max dimensions 1920×1080 |
| AI provider image support varies | Feature flag `IMAGE_PROVIDER`; degrade to upload-only |

---

## Out of scope (v2)

- Real-time collaboration
- Google Slides export
- Live database / Sheets connections
- Custom slide animations
- Full account system / cloud sync (still localStorage-first unless Phase 9 adds Supabase)
- PRD 7.8 Weekly Report templates (candidate **v2.1** or **v3**)

---

## Success metrics (v2)

| Metric | Target |
|--------|--------|
| % decks with manual preview edits before export | > 50% |
| % chart slides where user changes chart type | > 25% |
| % decks with at least one slide image | > 30% |
| Time from “see typo” to fixed export | < 2 min (no AI round-trip) |

---

## First step when starting v2

Implement **Phase 4.1** on `/preview/:id`: editable title + bullets on `content` slides, debounced `updateDeck`, verify `.pptx` export reflects edits. Then **4.2** chart type `Select` on chart slides.
