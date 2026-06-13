# SlideForge — Implementation Plan

> Build-ready plan derived from `PRD.md` (v1.0). Follows the PRD's phasing (Section 13) and adds the connective tissue: scaffolding, shared type contracts, and a build order that reaches a downloadable `.pptx` as fast as possible.

**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
**AI:** Claude API (`claude-sonnet-4-20250514`)
**Output engine:** pptxgenjs

---

## Guiding principles

- **Vertical slice first.** Get the full loop working end-to-end (description → JSON → `.pptx` download) with one theme and one slide type before going wide. This de-risks the two hardest pieces (Claude JSON reliability + pptxgenjs rendering) immediately.
- **A single shared type contract.** The slide manifest schema (PRD Section 5.1) is the spine of the app. Define it once in TypeScript (+ a Zod schema) and have the Claude output, the previewer, and the pptx renderer all consume it.
- **Stateless MVP.** localStorage + UUIDs, no DB (PRD Section 9.5).

---

## Locked-in decisions

- **Data parsing: Hybrid.** Excel/CSV parsed client-side with SheetJS/papaparse (only extracted JSON sent to Claude, per Section 9.4); PDFs go server-side to `/api/parse-data` via `pdf-parse`. Keeps payloads small for the common case and follows the PRD literally.
- **Preview fidelity: High.** `/preview/:id` uses CSS that closely mirrors the final `.pptx` look — themed colors, real layout hints (`two_col`, `hero`, `grid_2x2`, `full_bleed`), accurate type/spacing.
- **Scope:** Plan first; code only on explicit go-ahead.

---

## Impact of high-fidelity preview on architecture

The "accurate preview" decision is the one that meaningfully shapes the design:

- Introduce a **single layout spec module** (`lib/layout.ts`) defining slide geometry in normalized units (positions, font sizes, margins, grid) that *both* renderers consume — the React/CSS previewer and the pptxgenjs builder. Without this, the two drift and the "accurate" promise breaks.
- The HTML preview renders slides at a fixed 16:9 aspect (e.g. a scaled 960×540 box) mapping 1:1 to the 10″×7.5″ pptx canvas.
- Charts: preview uses a lightweight web chart lib (e.g. Recharts) styled to theme colors; pptx uses native chart objects. Same data, same color tokens, visually matched.

---

## Phase 0 — Scaffolding & contracts (foundation)

1. **Init project:** Next.js 14 (App Router) + TypeScript + Tailwind, then `shadcn/ui init`.
2. **Install dependencies** (PRD Section 15): `pptxgenjs xlsx papaparse @anthropic-ai/sdk pdf-parse zustand @tanstack/react-query uuid file-saver` + dev types.
3. **Env & config:** `.env.local` with `ANTHROPIC_API_KEY`; a small `lib/anthropic.ts` client wrapper pinned to `claude-sonnet-4-20250514`.
4. **Core type contract:** `lib/types.ts` + matching **Zod schema** in `lib/schema.ts` for the slide manifest (Section 5.1). Single source of truth.
5. **Theme tokens:** `lib/themes.ts` — all 7 themes from Section 6.1 as typed objects (wire 3 first).
6. **Shared layout spec:** `lib/layout.ts` — slide geometry consumed by both the previewer and the pptx renderer.
7. **App shell:** root layout, nav, React Query provider, Zustand builder store.

## Phase 1 — Core loop (the MVP that must work)

Build back-to-front so each piece is testable.

1. **`/api/generate-outline`** — description + options → Claude → validated slide JSON (Zod-parsed, with repair/retry on invalid JSON). Use the exact system prompt from PRD Section 14.
2. **`/api/generate-pptx`** — slide manifest → pptxgenjs → `.pptx` binary stream. Renderer module (`lib/pptx/`) with one function per slide type. Start with: Title, Content, Closing. 16:9, Arial/Calibri, speaker notes on every slide.
3. **Data parsing (hybrid):** Excel/CSV parsed client-side (SheetJS/papaparse) → columns, types, sample rows; PDFs → **`/api/parse-data`** (`pdf-parse`). Parsed metadata → Claude chart recommendations (Section 14 prompt).
4. **`/create` page** — builder UI: description textarea (2000 char), slide count / tone / audience / theme controls, file upload (drag-drop, `.xlsx/.xls/.csv/.pdf`), data preview table with chart-type override.
5. **`/preview/:id` page** — **high-fidelity** HTML/CSS slide previews from the manifest (themed, layout-hint accurate); reads from localStorage by UUID.
6. **`/export/:id` page** — trigger `.pptx` download via `file-saver`.
7. **Chart rendering:** native pptx chart objects for bar / line / pie first; chart-type selection logic from Section 4.2.
8. **Combined mode:** merge description outline + chart manifest into one manifest with `data_ref` wired to sheet data.

**Exit criteria:** All three input modes produce a downloadable, openable `.pptx` with charts, using 3 themes.

## Phase 2 — Polish

9. **`/api/regenerate-slide`** + per-slide Regenerate button with micro-prompt (PRD 7.1).
10. **Insight callout** auto-generation (7.2) — Section 14 prompt; inserts editable/deletable callout slides.
11. **Presenter script export** — `.docx` with notes rewritten to prose (7.3). Add `docx` dependency.
12. **Full theme system** — remaining 4 themes + custom 3-hex input with WCAG AA contrast validation + logo upload (Section 6.2).
13. **Remaining slide types** — Section Divider, KPI Callout, Table, Comparison, Quote, Timeline.

## Phase 3 — Differentiators

14. **`/api/remix`** + Remix-as-different-audience (7.4).
15. **Anomaly highlight mode** (7.5) — statistical scan + chart annotations, suppressible.
16. **Reverse-engineer competitor deck** (7.6) — parse uploaded `.pptx` structure as a skeleton.
17. **Multi-language output** (7.7) — language selector, RTL support.
18. **Supporting pages** — `/` landing, `/templates` gallery, `/history` (localStorage).

## Cross-cutting (throughout)

- **Non-functional targets** (Section 10): <8s to preview, <15s to download, 10MB Excel cap, 10k row / 500-point sampling, AA accessibility.
- **Error handling:** Claude JSON validation + retry, file-size/type guards, friendly failure states.

---

## Biggest risks (in build order)

1. **Claude JSON reliability** — enforce schema with Zod + a repair/retry pass; foundation of everything.
2. **Preview ↔ pptx visual parity** — solved by the shared `lib/layout.ts`; still needs eyeballing.
3. **Native pptx charts** — pptxgenjs chart config is fiddly; budget time for bar/line/pie before exotic types.

---

## Suggested first step

**Phase 0 scaffolding**, then a **thin vertical slice** (description → JSON → `.pptx`) to prove out the two riskiest pieces before going wide.
