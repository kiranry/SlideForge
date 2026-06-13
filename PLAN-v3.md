# SlideForge — Implementation Plan v3

> Post-v2 plan: **deck assembly**, **repeatable workflows**, **sharing & export breadth**, **connected data**, and **cloud persistence last**. Builds on completed v1 (`PLAN.md`) and v2 (`PLAN-v2.md`).

**Prerequisites:** v1 Phases 0–3 and v2 Phases 4–8 implemented (see inventory below).

**Stack (baseline):** Next.js 14, TypeScript, Tailwind, shadcn/ui, pptxgenjs, Zustand, React Query, localStorage + IndexedDB.

**v3 stack additions (proposed):** `@react-pdf/renderer` or `pdf-lib` for PDF export, optional Google Slides API; **Supabase (auth + Postgres + storage) deferred to Phase 19** — all earlier phases ship local-first (localStorage + IndexedDB).

---

## v3 goals (user-facing)

1. **Full deck assembly in preview** — add, duplicate, reorder, and delete any slide; remix respects locked slides.
2. **Weekly / recurring reports** — save a column→slide mapping and regenerate the same deck structure from a new upload (PRD 7.8).
3. **Share and collaborate** — read-only share links, async comments, version snapshots (local-first, then cloud in Phase 19).
4. **More export paths** — PDF handout, Google Slides (where API permits), packaged zip (pptx + script + source data).
5. **Brand kit** — saved fonts, colors, logos reused across decks (local-first; org sync in Phase 19).
6. **Live and connected data** — Google Sheets / CSV URL refresh without re-uploading the whole file.
7. **Programmatic access** — API keys and a thin SDK for “generate deck from our backend” integrations.
8. **Accounts & cloud sync (last)** — sign in, sync history across devices, migrate local decks to Supabase.

---

## Implemented inventory (do not rebuild)

Audit of the current codebase as of v2 completion.

### v1 — Core loop & differentiators

| Area | Status | Key locations |
|------|--------|---------------|
| Three input modes (description, data, combined) | ✅ | `builder-form.tsx`, `store.ts` |
| `/api/generate-outline` + Zod validation | ✅ | `api/generate-outline/route.ts`, `schema.ts` |
| `/api/generate-pptx` + native charts | ✅ | `api/generate-pptx/route.ts`, `lib/pptx/` |
| Hybrid data parsing (client Excel/CSV, server PDF) | ✅ | `parse-client.ts`, `api/parse-data/` |
| High-fidelity preview (`/preview/:id`) | ✅ | `deck-preview.tsx`, `slide-canvas.tsx`, `layout.ts` |
| Export page + presenter script `.docx` | ✅ | `export-panel.tsx`, `presenter-docx.ts` |
| 10 slide types in schema + renderer | ✅ | `schema.ts`, `pptx/render.ts`, `slide-canvas.tsx` |
| 7 chart types (bar, line, area, pie, donut, scatter, combo) | ✅ | `schema.ts`, `pptx/charts.ts` |
| 7 built-in themes + custom 3-hex + WCAG contrast | ✅ | `themes.ts`, `custom-theme-picker.tsx`, `contrast.ts` |
| Logo upload + optional all-slide footer | ✅ | `logo-upload.tsx`, `pptx/render.ts` |
| Per-slide regenerate (AI dialog) | ✅ | `regenerate-slide-dialog.tsx`, `api/regenerate-slide/` |
| Insight callout auto-generation | ✅ | `api/generate-insights/`, `insights.ts` |
| Remix as different audience | ✅ | `remix-dialog.tsx`, `api/remix/` |
| Anomaly detection + suppress before export | ✅ | `anomalies.ts`, `anomaly-panel.tsx` |
| Competitor deck structure extract | ✅ | `competitor-deck-upload.tsx`, `api/parse-pptx/` |
| 24 languages + RTL in manifest/pptx | ✅ | `languages.ts`, `manifest.rtl` |
| Landing, templates (10), history (localStorage) | ✅ | `page.tsx`, `templates.ts`, `history/page.tsx` |
| AI provider abstraction (Gemini / Anthropic) | ✅ | `lib/ai/` |

### v2 — Interactive preview & media

| Area | Status | Key locations |
|------|--------|---------------|
| Inline text edit (all major slide types) | ✅ | `editable-field.tsx`, `slide-canvas.tsx` |
| Table + timeline cell editing | ✅ | `slide-canvas.tsx` (`TableSlide`, `TimelineSlide`) |
| Chart type + axis pickers in preview | ✅ | `chart-toolbar.tsx` |
| Chart data panel (view + edit cells) | ✅ | `chart-data-panel.tsx`, `data-edit.ts` |
| Attach data file from preview | ✅ | `chart-controls-panel.tsx` |
| `/api/suggest-chart` + AI rationale | ✅ | `api/suggest-chart/`, `chart.ai_rationale` |
| `/api/edit-chart` (NL chart edits) | ✅ | `api/edit-chart/`, `chart-toolbar.tsx` |
| Per-slide image upload (PNG/JPEG) | ✅ | `slide-media-panel.tsx` |
| AI image generation (multi-provider) | ✅ | `api/generate-image/`, `slide-images.ts` |
| Placements: right, inline, hero | ✅ | `slideImageSchema`, `element-boxes.ts` |
| IndexedDB for large images | ✅ | `image-store.ts`, `deck-media.ts` |
| Undo/redo manifest (Ctrl+Z) | ✅ | `deck-history.ts`, `deck-preview.tsx` |
| Tab between editable fields | ✅ | `slide-field-nav.ts` |
| Drag/resize element boxes | ✅ | `positionable-box.tsx`, `element_boxes` |
| `dataModified` badge | ✅ | `StoredDeck.dataModified`, `chart-data-panel.tsx` |

---

## Gaps & polish in current build (v3.0 quick wins)

Items implied by prior plans or PRD but missing or partial — ship before large v3 infrastructure.

| Gap | Proposed fix | Effort |
|-----|--------------|--------|
| Delete slide only for `is_insight` slides | Add/delete/duplicate any slide type in preview | M |
| No slide reorder | Thumbnail drag-and-drop or move up/down | M |
| `locked` slide flag (skip remix overwrite) | `slide.locked` in schema; remix API filters | S |
| SVG logo in pptx | Rasterize SVG client-side before `addImage`, or restrict UI to PNG/JPEG | S |
| Speaker notes editable in preview | Notes textarea already partial — ensure all slide types | S |
| Grouped vs stacked bar not explicit | `chart.stacked` / `chart.grouped` in schema + pptx | M |
| Appendix for tables > 8 rows | Auto appendix slide(s) on export | M |
| Template gallery is prompt-only | “Use template” pre-fills builder; no saved user templates | — (v3) |
| History is local only | Cloud history (v3 Phase 19) | L |
| No share URL | Read-only share (v3 Phase 12) | L |
| Mobile preview UX | Responsive stage + touch-friendly controls | M |
| NFR telemetry | Client timing for generate/export; optional analytics | S |

---

## Guiding principles (v3)

- **Local-first until Phase 19.** All v3 features ship against localStorage + IndexedDB first; Supabase auth and sync are the final phase, not a prerequisite.
- **Cloud is optional after Phase 19.** Guest/localStorage mode remains; sign-in unlocks cross-device sync and org brand kits.
- **Templates are data, not prompts only.** Weekly Report stores manifest skeleton + column bindings, not just a text prompt.
- **Export stays pptx-first.** PDF and Slides are secondary artifacts from the same manifest.
- **Collaboration is async.** No real-time cursors in v3; comment threads and version snapshots instead.
- **API mirrors UI.** Every v3 server capability exposed via REST with the same Zod contracts.

---

## Architecture overview (v3)

```
/create ──► manifest + data ──► localStorage + IndexedDB (Phases 10–18)
                                   │
/preview/:id ◄─────────────────────┘
    │
    ├── SlideFilmstrip (reorder, add, duplicate, delete, lock)
    ├── DeckAssemblyToolbar
    └── (existing v2 editors)

/templates
    ├── Built-in DECK_TEMPLATES (existing)
    └── UserSavedTemplate (localStorage → Supabase in Phase 19)

/api/v1/*  ── programmatic generate + export (API keys)

Share link ──► /share/:token (signed payload or server token; cloud-backed in Phase 19)

                    ┌─────────────────────────────────────┐
                    │     Phase 19 — Supabase (last)      │
                    │  Auth · Postgres · Storage · RLS    │
                    └──────────────┬──────────────────────┘
                                   │
              DeckRepository migrates local ──► cloud sync
```

**New modules (proposed):**

- `lib/deck-repository.ts` — localStorage adapter first; Supabase adapter added in Phase 19
- `lib/templates/saved-template.ts` — Weekly Report + custom skeleton types
- `lib/slide-assembly.ts` — add, remove, reorder, duplicate slides
- `lib/export/pdf.ts` — PDF handout builder
- `lib/export/bundle.ts` — zip pptx + docx + csv

---

## Phase 10 — Deck assembly & slide locks

**Goal:** Full manual control of slide order and count without AI.

### 10.1 Slide filmstrip

| Task | Detail |
|------|--------|
| Thumbnail rail | Reorder via drag-and-drop; updates `slide.index` |
| Add slide | Pick type from menu → blank slide with defaults |
| Duplicate / delete | Any slide type (not only insights) |
| Keyboard | Delete slide, duplicate with modifier |

### 10.2 Slide lock

| Task | Detail |
|------|--------|
| `slide.locked?: boolean` | Toggle in preview toolbar |
| Remix / regenerate | Skip locked slides; show count of locked slides in remix dialog |
| Regenerate single | Warn if locked |

### 10.3 Blank slide defaults

| Task | Detail |
|------|--------|
| `lib/slide-defaults.ts` | Factory per `SlideType` for empty shells |

**Exit criteria:** User duplicates slide 4, drags it to position 2, locks it, remixes for “executive summary” — locked slide unchanged.

---

## Phase 11 — Weekly Report & saved templates (PRD 7.8)

**Goal:** One-click regeneration from a new file using a saved structure.

### 11.1 Saved template model

```ts
interface SavedDeckTemplate {
  id: string;
  name: string;
  kind: "prompt" | "weekly_report" | "skeleton";
  /** For weekly_report: bindings per slide */
  bindings?: Array<{
    slideIndex: number;
    sheet: string;
    chart?: { x_col: string; y_cols: string[]; type: ChartType };
    kpi?: { label_col?: string; value_col?: string };
  }>;
  /** Base manifest without data-bound values, or prompt-only */
  skeletonManifest?: SlideManifest;
  theme: string;
  tone?: Tone;
  audience?: Audience;
}
```

### 11.2 UI

| Task | Detail |
|------|--------|
| “Save as template” on export/preview | Name + kind selector |
| `/templates` page | Tabs: Built-in · My templates |
| Persistence | **localStorage** in Phases 11–18; migrate to Supabase in Phase 19 |
| Weekly Report flow | Upload new Excel → match columns by name (fuzzy) → regenerate manifest |
| Column mismatch UI | Highlight missing columns; allow manual mapping |

### 11.3 API

| Route | Purpose |
|-------|---------|
| `/api/apply-template` | `templateId` + `parsedData` → new manifest |

**Exit criteria:** Save QBR template from March deck; upload April Excel; one click produces April deck with same slide order and chart types.

---

## Phase 12 — Sharing & async collaboration

**Goal:** Send a deck to a stakeholder without exporting first.

### 12.1 Read-only share links

| Task | Detail |
|------|--------|
| `/share/:token` | Public read-only preview + download pptx (if owner allows) |
| Expiry + revoke | Owner dashboard |
| No account required to view | Token-gated |

### 12.2 Comments (async)

| Task | Detail |
|------|--------|
| Per-slide comment thread | Local JSON on deck row first; Postgres in Phase 19 |
| Resolve / notify | Email optional after Phase 19 (Supabase hooks) |

### 12.3 Version snapshots

| Task | Detail |
|------|--------|
| Auto snapshot on export | Local version stack on `StoredDeck` first; `deck_versions` table in Phase 19 |
| “Restore version” | Replace manifest from snapshot |

**Out of scope v3:** Real-time multiplayer cursors, simultaneous editing.

**Exit criteria:** Share link opens preview on phone; comment on slide 5 visible to owner.

---

## Phase 13 — Export breadth

**Goal:** More deliverable formats from one manifest.

### 13.1 PDF handout

| Task | Detail |
|------|--------|
| `/api/generate-pdf` | Slide raster or vector PDF; 16:9 slides stacked or grid |
| Options | Slides only vs slides + notes |

### 13.2 Export bundle

| Task | Detail |
|------|--------|
| Zip download | `.pptx` + `presenter-script.docx` + `source-data.csv` |
| `/api/generate-bundle` | Stream zip |

### 13.3 Google Slides export (stretch)

| Task | Detail |
|------|--------|
| Google Slides API | Create presentation, insert text/shapes; charts as linked images |
| Limitation doc | Native editable charts unlikely — position as “import structure” |

### 13.4 PPTX import (full content)

| Task | Detail |
|------|--------|
| Extend `parse-pptx` | Import text + structure into manifest (not just skeleton) |
| Round-trip | Edit imported deck in preview |

**Exit criteria:** Download zip with pptx and csv; PDF opens with all slides legible.

---

## Phase 14 — Brand kit & advanced theming

**Goal:** Consistent brand across decks and team.

### 14.1 Brand kit entity

| Task | Detail |
|------|--------|
| `brand_kits` | Primary/secondary/accent, heading/body font names, logo refs |
| Persistence | localStorage in Phase 14; org-shared kits in Phase 19 |
| Apply on create | Default kit from last used; org default after Phase 19 |

### 14.2 Font embedding

| Task | Detail |
|------|--------|
| pptxgenjs font list | Allow safe custom fonts with fallback |
| Preview font sync | CSS `font-family` from kit |

### 14.3 Chart palette overrides

| Task | Detail |
|------|--------|
| `chart.colors?: string[]` per slide or kit | Override theme chart tokens |

**Exit criteria:** Two decks from same brand kit match colors and logo placement without re-uploading logo.

---

## Phase 15 — Connected data

**Goal:** Refresh charts without re-uploading files.

### 15.1 Data sources

| Source | Approach |
|--------|----------|
| Google Sheets | OAuth + Sheets API; poll or manual refresh |
| Public CSV URL | Server fetch on refresh (allowlist domains) |
| Paste table | Quick mini-sheet in builder |

### 15.2 Refresh UX

| Task | Detail |
|------|--------|
| “Refresh data” on preview | Re-parse → update `StoredDeck.data` → re-resolve charts |
| Stale indicator | “Data from 3 days ago” |
| Conflict | If `dataModified`, warn before overwrite |

**Exit criteria:** Link Sheets URL; click refresh; chart values update in preview and export.

---

## Phase 16 — Programmatic API & integrations

**Goal:** SlideForge as an internal service.

### 16.1 API v1

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/outline` | Description → manifest |
| `POST /api/v1/decks` | Create deck from manifest |
| `POST /api/v1/decks/:id/export` | pptx binary |
| Auth | API keys in header; rate limits |

### 16.2 Webhooks

| Event | Payload |
|-------|---------|
| `deck.exported` | deck id, user, format |

### 16.3 SDK (thin)

| Package | `slideforge-node` — wrap v1 routes |

**Exit criteria:** CI job posts JSON manifest; receives pptx artifact.

---

## Phase 17 — Presentation & delivery modes

**Goal:** Present from browser, not only PowerPoint.

### 17.1 Presenter view

| Task | Detail |
|------|--------|
| `/present/:id` | Full-screen slide + next slide preview |
| Speaker notes panel | Second screen or collapsible strip |
| Timer | Optional talk track timer |

### 17.2 AI narration (stretch)

| Task | Detail |
|------|--------|
| TTS per slide | From speaker notes; export audio zip |

### 17.3 Video embed slide type

| Task | Detail |
|------|--------|
| `slide.video?: { url, poster? }` | Preview embed; pptx links to URL or poster image |

**Exit criteria:** Present mode keyboard navigation works; notes visible alongside slide.

---

## Phase 18 — Quality, accessibility, and ops

| Item | Action |
|------|--------|
| Performance budgets | Log `generate-outline` / `generate-pptx` durations; surface in UI |
| Accessibility audit | WCAG AA on all v2 editable controls; screen reader pass |
| Mobile | Touch drag for filmstrip; larger tap targets on chart toolbar |
| Error recovery | Partial manifest repair; “retry slide N” batch |
| i18n UI | App chrome in user language (separate from deck language) |
| Analytics | Privacy-conscious events: mode, export, edit depth |
| E2E tests | Playwright: create → edit → export golden path |
| Load testing | Large 500-row sheets + 20-slide decks |

---

## Phase 19 — Accounts & cloud persistence (last)

**Goal:** Decks survive browser clears; optional multi-device sync. **Ship after all local-first phases** so auth/infra does not block product features.

### 19.1 Auth

| Task | Detail |
|------|--------|
| Supabase Auth | Email magic link + Google OAuth |
| Guest mode | Continue without account; “Save to cloud” CTA on export |
| Session in API routes | Verify JWT for cloud mutations |

### 19.2 Deck sync

| Task | Detail |
|------|--------|
| `decks` table | `id`, `user_id`, `manifest` (jsonb), `meta`, `created_at`, `updated_at` |
| `deck_assets` | Large blobs in Supabase Storage; refs in manifest (`imageRef`, `logoRef`) |
| `DeckRepository` | Supabase adapter alongside existing localStorage path |
| Migration path | On sign-in, offer “Import local decks” from localStorage + IndexedDB |
| Offline | Read cached deck from IndexedDB; queue writes when offline (stretch) |

### 19.3 Cloud-backed features (migrate from local)

| Feature | Action |
|---------|--------|
| History & search | Paginated cloud history; filter by title, tags, date |
| Saved templates | Weekly Report templates synced to user account |
| Share links | Persistent tokens + revoke in Postgres |
| Comments & versions | Move local comment/snapshot stacks to `deck_versions` + comments tables |
| Brand kits | Org-scoped `brand_kits` shared across team |

### 19.4 Tags / folders

| Task | Detail |
|------|--------|
| Optional `tags[]` on deck row | Folder-like grouping in cloud history |

**Exit criteria:** Sign in on two browsers; create deck on A; open history on B and preview the same deck. Local-only mode still works without an account.

---

## API summary (v3 additions)

| Route | Purpose |
|-------|---------|
| `/api/apply-template` | Template + data → manifest |
| `/api/generate-pdf` | Manifest → PDF |
| `/api/generate-bundle` | Manifest → zip |
| `/api/v1/*` | Programmatic access |
| `/api/share` | Create/revoke share tokens |
| `/api/data/refresh` | Connected source → ParsedData |
| Supabase RPC (Phase 19) | Comments, versions, brand kits, deck sync |

Existing v1/v2 routes unchanged.

---

## Suggested build order

1. **Phase 10** — Deck assembly + locks (high value, no new infra)
2. **Gaps table** — SVG logo, stacked bar, appendix slides
3. **Phase 11** — Weekly Report templates (localStorage)
4. **Phase 12** — Share links (signed/local first)
5. **Phase 13.1–13.2** — PDF + bundle export
6. **Phase 14** — Brand kit (local)
7. **Phase 15** — Connected data
8. **Phase 17.1** — Presenter view
9. **Phase 13.3–13.4** — Google Slides + full pptx import (stretch)
10. **Phase 16** — API v1
11. **Phase 18** — Ops and polish
12. **Phase 19** — Auth + Supabase cloud sync **(last)**

---

## Risks

| Risk | Mitigation |
|------|------------|
| Supabase RLS complexity | Deferred to Phase 19; start with user-owned rows only |
| Google Slides chart fidelity | Ship as beta; document limitations |
| Weekly Report column drift | Fuzzy match + manual mapping UI |
| Cloud storage costs | Compress images; tier limits per user |
| API abuse | Rate limits; captcha on guest generate |
| PDF font/layout drift | Same `layout.ts` math as preview; test golden files |

---

## Out of scope (v3)

- Real-time collaborative editing (Google Docs style)
- Custom slide animations / transitions
- Native mobile apps
- On-prem air-gapped deploy (unless Phase 16 enterprise fork)
- Full PowerPoint round-trip fidelity (complex master slides, SmartArt)
- Billing/subscriptions (can be Phase 20 if needed)

---

## Success metrics (v3)

| Metric | Target |
|--------|--------|
| % decks saved to cloud (signed-in users) | > 80% |
| % Weekly Report users who regenerate 2+ times | > 40% |
| Share link views / exports | Track adoption |
| % decks with manual slide reorder/add | > 30% |
| API export success rate | > 99% |
| Time to refresh connected data | < 5s |

---

## First step when starting v3

Implement **Phase 10.1**: slide filmstrip with add/duplicate/delete/reorder on `/preview/:id`, persist via existing `updateDeck`, verify export order matches preview. Then add **`slide.locked`** and filter remix/regenerate (Phase 10.2).

---

*PLAN v3 — SlideForge. Derived from codebase audit + PRD v1.0 + PLAN.md + PLAN-v2.md.*