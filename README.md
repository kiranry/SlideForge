# SlideForge

**AI-native presentation builder.** Turn a description, a spreadsheet, or both into a polished, editable `.pptx` — native PowerPoint charts, speaker notes, and themes that look intentional, not generated.

PowerPoint is the deliverable. The in-browser preview is for editing; the exported file opens cleanly in Microsoft PowerPoint, Google Slides, and Keynote.

---

## Key features

| Feature | What it does |
|---------|--------------|
| **Three input modes** | Build from a text brief, a data file, or both combined |
| **Native `.pptx` output** | Real PowerPoint charts and speaker notes — not screenshots |
| **High-fidelity preview** | Edit text, charts, images, and slide order before export |
| **Anomaly detection** | Flags outliers, spikes, dips, and zeros in uploaded data |
| **Competitor deck matching** | Upload a `.pptx` to mirror another deck's structure |
| **24 languages + RTL** | Generate decks in Arabic, Hebrew, Japanese, and more |
| **AI regeneration & remix** | Re-write one slide or re-target the whole deck for a new audience |
| **Brand kits & themes** | 7 presets, custom palettes, saved logos and fonts |
| **Multi-format export** | `.pptx`, PDF handout, presenter script, zip bundle |
| **Share & collaborate** | Read-only links, comments, and version snapshots (local-first) |

---

## Features

### Three input modes

| Mode | What you provide | What you get |
|------|------------------|--------------|
| **Description** | Free-form brief (up to 2,000 characters) | Structured deck with titles, bullets, and speaker notes |
| **Data** | Excel (`.xlsx`/`.xls`), CSV, or tabular PDF | Chart-heavy deck with auto-detected column types and chart suggestions |
| **Combined** | Description + data file | Narrative woven around your numbers — text and charts interleaved |

### Slide types (10)

Title · Section divider · Content · Chart · KPI callout · Table · Comparison · Quote · Timeline · Closing

### Charts (7 native pptx types)

Bar · Line · Area · Pie · Donut · Scatter · Combo (dual-axis bar + line)

Charts are embedded as **native PowerPoint chart objects** — editable after export, not flat images.

### Design & branding

- **7 built-in themes** (Midnight Executive, Coral Energy, Forest & Moss, Charcoal Minimal, Warm Terracotta, Ocean Gradient, Berry & Cream)
- **Custom 3-color palette** with WCAG contrast validation
- **Brand kits** — save fonts, colors, and logos; reuse across decks (`/brand-kits`)
- **Logo upload** with optional footer on every slide

See also: [Anomaly detection](#anomaly-detection) · [Competitor deck matching](#competitor-deck-matching) · [Multilingual output](#multilingual-output)

### Interactive preview (`/preview/:id`)

- Inline text editing on all major slide types
- Add, duplicate, reorder, and delete slides
- Per-slide AI regenerate and full-deck **remix** (re-target a different audience)
- Chart type picker, axis controls, editable data cells, and natural-language chart edits
- AI image generation (hero / inline / right placement) and manual image upload
- Drag-and-resize element boxes, undo/redo (Ctrl+Z), keyboard navigation between fields
- Anomaly callouts on chart slides with suppress-before-export ([details](#anomaly-detection))

### Export formats

| Format | Contents |
|--------|----------|
| **`.pptx`** | Full deck with native charts, speaker notes, 16:9 layout |
| **`.pdf`** | Handout (stacked or grid layout; optional speaker notes) |
| **`.docx`** | AI-generated presenter script |
| **`.zip` bundle** | pptx + presenter script + source CSV |

### Collaboration (local-first)

- **Share links** — read-only deck viewer with async comments
- **Version snapshots** — restore prior manifest states
- **Saved templates** — capture and reapply deck structures
- **10 starter templates** — Series A pitch, QBR, product launch, and more (`/templates`)
- **Deck history** — browse past builds in the browser (`/history`)

---

## Anomaly detection

SlideForge scans uploaded spreadsheet data **locally** (no AI) and flags values that look wrong before you export. Detection runs at deck creation, when you attach a data file, and whenever you edit cells in the chart data panel.

### What gets flagged

| Kind | Rule | Example |
|------|------|---------|
| **Outlier** | IQR method — value outside Q1 − 1.5×IQR or Q3 + 1.5×IQR (needs ≥4 points) | `Outlier: Q3 = 999999` |
| **Drop** | >40% decrease vs. the previous row | `⚠️ Dip in March (-52%) — check source data` |
| **Spike** | ≥80% increase vs. the previous row | `Spike in April (+120%)` |
| **Zero** | A `0` in a column that otherwise has non-zero values | `Zero value in June for Revenue` |

Every numeric column in every sheet is scanned. Flags are de-duplicated and stored on the deck as `anomalyFlags`.

### Where you see them

1. **Anomaly panel** (preview and export) — lists all flags; **Hide** adds them to a suppress list without changing the underlying data
2. **Chart slides** — up to 2 red callout labels overlaid on the relevant chart
3. **Chart data panel** — flagged rows highlighted in the editable table
4. **Exported `.pptx`** — unsuppressed callouts rendered at the bottom of chart slides

Anomalies are filtered per chart by sheet name and primary Y column. Suppressed flags are excluded from preview callouts and export.

> **Note:** Drop/spike detection compares **consecutive rows** as they appear in the file — sort your data chronologically if you rely on trend flags. Description-only decks (no data file) skip detection entirely.

Implementation: `src/lib/anomalies.ts`

---

## Competitor deck matching

Upload an existing `.pptx` on the **Build a deck** page to mirror its structure when generating yours. SlideForge extracts a **structure skeleton** — not the competitor's content — and passes it to the outline AI so your new deck follows the same flow.

### How it works

```
Upload competitor .pptx  →  /api/parse-pptx  →  structure skeleton
        ↓
Your description (+ optional data)  →  /api/generate-outline  →  new deck matching that structure
```

The parser (`src/lib/pptx-parse.ts`) reads each slide's XML and extracts:

- Slide index and inferred type (title, closing, chart, divider, quote, content)
- Title text (first text block)
- Body preview (next few text blocks)
- Whether the slide contains a chart

### Usage

1. On `/create`, scroll to **Match a competitor deck**
2. Drag-and-drop or select a `.pptx` (max **15 MB**)
3. Confirm the extracted slide count, then generate as usual

The skeleton guides slide count and type sequence; your description, data, tone, and theme still drive the actual content. Remove the skeleton anytime with the ✕ button to return to free-form generation.

---

## Multilingual output

Choose an output language on the builder form. The AI generates slide titles, body copy, and speaker notes in that language; RTL layout is applied automatically where needed.

### Supported languages (24)

| | | | |
|---|---|---|---|
| English | Spanish (Español) | French (Français) | German (Deutsch) |
| Portuguese (Português) | Italian (Italiano) | Dutch (Nederlands) | Polish (Polski) |
| Russian (Русский) | Ukrainian (Українська) | Hindi (हिन्दी) | Bengali (বাংলা) |
| Japanese (日本語) | Korean (한국어) | Chinese Simplified (简体中文) | Chinese Traditional (繁體中文) |
| Thai (ไทย) | Vietnamese (Tiếng Việt) | Indonesian (Bahasa Indonesia) | Turkish (Türkçe) |
| Swedish (Svenska) | **Arabic** (العربية) | **Hebrew** (עברית) | **Persian** (فارسی) |

**RTL languages** (Arabic, Hebrew, Persian) set `manifest.rtl = true`, which flips text alignment in the HTML preview and the pptx renderer.

Implementation: `src/lib/languages.ts`

---

## Quick start

### Prerequisites

- **Node.js 18+** (20 recommended)
- An AI API key — [Google AI Studio](https://aistudio.google.com/apikey) (free tier works) or [Anthropic](https://console.anthropic.com/)

### Install & run

```bash
git clone <your-repo-url>
cd PPTX          # or your clone directory
npm install

cp .env.example .env.local
# Edit .env.local — at minimum set GOOGLE_API_KEY (see below)

npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Start building**, describe your deck, and export.

### Verify your AI key

```bash
npm run check:ai
```

Makes one minimal generation call using `.env.local` and reports success or a actionable error (invalid key, wrong model name, rate limit).

---

## Environment variables

Copy `.env.example` to `.env.local`. Server-side keys never ship to the browser.

### AI text generation (required)

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | `gemini` | `gemini` or `anthropic` |
| `GOOGLE_API_KEY` | — | Required when `AI_PROVIDER=gemini` |
| `GOOGLE_MODEL` | `gemini-2.5-flash-lite` | Outline, insights, remix, etc. |
| `ANTHROPIC_API_KEY` | — | Required when `AI_PROVIDER=anthropic` |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | Anthropic model ID |

**Recommended free-tier setup:**

```env
AI_PROVIDER=gemini
GOOGLE_API_KEY=your_key_here
GOOGLE_MODEL=gemini-2.5-flash-lite
SKIP_GOOGLE_IMAGE=1
IMAGE_PROVIDER=huggingface
HUGGINGFACE_API_KEY=your_hf_token_here
```

### AI image generation (optional)

Slide images use a separate provider chain. Free Google AI Studio keys often have **zero image quota** — set `SKIP_GOOGLE_IMAGE=1` to avoid slow failures.

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_IMAGE_MODEL` | `gemini-2.5-flash-image` | Gemini native images (paid quota) |
| `SKIP_GOOGLE_IMAGE` | — | Set to `1` on free Google keys |
| `IMAGE_PROVIDER` | `auto` | `auto` · `gemini` · `huggingface` · `pollinations` |
| `HUGGINGFACE_API_KEY` | — | [HF Inference token](https://huggingface.co/settings/tokens) — recommended on free Google keys |
| `HUGGINGFACE_IMAGE_MODEL` | `black-forest-labs/FLUX.1-schnell` | Override image model |

### Debugging

```env
NEXT_PUBLIC_TELEMETRY=1   # Client-side timing logs for generate/export
```

---

## How it works

```
User input (description ± data file)
        ↓
  /api/generate-outline  →  AI produces JSON slide manifest (Zod-validated)
        ↓
  Preview & edit in browser  (localStorage + IndexedDB)
        ↓
  /api/generate-pptx  →  pptxgenjs renderer  →  downloadable .pptx
```

**Data parsing:** Excel and CSV are parsed client-side; PDF tables are parsed server-side via `/api/parse-data`.

**Single source of truth:** The slide manifest (`src/lib/schema.ts`) drives the HTML preview, the pptx renderer, and export — keeping preview and output aligned.

---

## App routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/create` | Builder — input modes, theme, tone, audience, data upload |
| `/preview/:id` | Full deck editor |
| `/export/:id` | Download pptx, PDF, bundle, presenter script |
| `/templates` | 10 pre-built deck prompts |
| `/brand-kits` | Manage reusable brand palettes and logos |
| `/history` | Past decks (browser localStorage) |
| `/share/:token` | Read-only shared deck viewer |

---

## API routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/generate-outline` | POST | AI slide manifest from description ± data |
| `/api/generate-pptx` | POST | Render manifest → `.pptx` bytes |
| `/api/generate-pdf` | POST | PDF handout |
| `/api/generate-bundle` | POST | Zip: pptx + script + CSV |
| `/api/generate-presenter-script` | POST | Presenter `.docx` |
| `/api/parse-data` | POST | Server-side PDF / data parsing |
| `/api/parse-pptx` | POST | Extract structure from competitor deck |
| `/api/generate-insights` | POST | Auto insight callout slides |
| `/api/generate-synthetic-data` | POST | AI-generated chart data when none uploaded |
| `/api/regenerate-slide` | POST | Re-generate a single slide |
| `/api/remix` | POST | Re-target deck for a new audience |
| `/api/suggest-chart` | POST | AI chart type + rationale |
| `/api/edit-chart` | POST | Natural-language chart edits |
| `/api/recommend-charts` | POST | Chart recommendations from parsed data |
| `/api/generate-image` | POST | AI slide imagery |
| `/api/generate-image/status` | GET | Image provider availability |
| `/api/apply-template` | POST | Apply saved template to manifest |
| `/api/share` | POST | Create share link |
| `/api/share/[token]` | GET / DELETE | Read or revoke share |
| `/api/share/[token]/comments` | GET / POST | Async comments on shared decks |
| `/api/share/batch` | POST | Batch share operations |

---

## Project structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── create/           # Builder form
│   ├── preview/[id]/     # Deck editor
│   ├── export/[id]/      # Export panel
│   ├── templates/        # Starter templates
│   ├── brand-kits/       # Brand kit manager
│   ├── history/          # Deck history
│   └── share/[token]/    # Shared viewer
├── components/           # UI — builder, preview, charts, dialogs
└── lib/
    ├── ai/               # Gemini & Anthropic provider abstraction
    ├── pptx/             # pptxgenjs renderer (charts, tables, themes)
    ├── export/           # PDF, CSV, zip bundle builders
    ├── schema.ts         # Zod slide manifest (single source of truth)
    ├── themes.ts         # 7 design themes + custom palette
    ├── storage.ts        # localStorage deck persistence
    └── image-store.ts    # IndexedDB for large slide images
scripts/
└── check-ai.mjs          # AI key verification
data/shares/              # Local share link payloads (dev)
```

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router), TypeScript |
| UI | Tailwind CSS, shadcn/ui, Radix, Lucide |
| State | Zustand (builder), React Query (mutations) |
| AI | Google Gemini (default) or Anthropic Claude |
| Output | pptxgenjs, pdf-lib, docx, JSZip |
| Data | PapaParse, xlsx, pdf-parse |
| Persistence | localStorage + IndexedDB (local-first; no account required) |
| Validation | Zod |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint (Next.js config) |
| `npm run check:ai` | Verify AI provider + API key |

---

## Data & privacy

SlideForge is **local-first**:

- Decks, brand kits, templates, and history live in **your browser** (localStorage + IndexedDB).
- AI requests send your description and parsed data to the configured provider (Gemini or Anthropic) for generation only.
- Share links write read-only snapshots to the server's `data/shares/` directory in development; there is no cloud sync or user accounts yet (planned in `PLAN-v3.md`).

Do not commit `.env.local` — it contains API keys.

---

## Builder options reference

When creating a deck at `/create`:

| Control | Options |
|---------|---------|
| Slide count | 5 / 10 / 15 / custom |
| Tone | Professional · Casual · Academic · Sales · Technical |
| Audience | Executive · General · Technical · Investor |
| Language | [24 languages](#multilingual-output) — Arabic, Hebrew, Persian use RTL layout |
| Theme | 7 presets or custom 3-hex palette |
| Logo | Optional PNG/JPEG, all-slide footer toggle |
| Brand kit | Apply saved fonts, colors, logo |
| Competitor deck | [Upload `.pptx`](#competitor-deck-matching) to mirror another deck's structure |
| Auto chart data | Generate synthetic data when outline includes charts but no file uploaded |

---

## Roadmap

See [`PLAN-v3.md`](./PLAN-v3.md) for the active roadmap: connected data (Google Sheets / CSV URLs), programmatic API, Google Slides export, and cloud sync (Supabase) as a later phase.

Product requirements: [`PRD.md`](./PRD.md).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Missing required environment variable: GOOGLE_API_KEY` | Copy `.env.example` → `.env.local` and add your key |
| Generation fails with 429 | Rate limit / quota — wait or switch model (`GOOGLE_MODEL`) |
| Image generation hangs or fails | Set `SKIP_GOOGLE_IMAGE=1` and add `HUGGINGFACE_API_KEY` |
| Deck not found on refresh | Decks are per-browser; history is in localStorage |
| Charts look wrong after edit | Check the data-modified badge; re-export to refresh pptx |
| Too many anomaly flags | Suppress false positives in the anomaly panel before export; flags re-run when data is edited |
| Competitor deck parse fails | Ensure the file is a valid `.pptx` under 15 MB with at least one slide |

Run `npm run check:ai` first — it surfaces key, model, and HTTP errors with hints.

---

## License

Private project (`"private": true` in `package.json`). All rights reserved unless otherwise specified by the repository owner.
