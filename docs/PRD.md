# Product Requirements Document
## SlideForge — AI-Powered Presentation Builder
**Version:** 1.0  
**Status:** Draft for Development  
**Target Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui  
**AI Layer:** Claude API (claude-sonnet-4-20250514)  
**Output Engine:** pptxgenjs  

---

## 1. Product Overview

SlideForge is an AI-native presentation builder that generates polished PowerPoint (.pptx) files through three input modes:

1. **Text Description** — user describes the presentation, AI generates structured slides
2. **Data File (Excel / CSV)** — app parses data, auto-selects chart types, builds a data-rich deck
3. **Combined Mode** — user provides both a description AND a data file; the AI weaves narrative around the data

The output is a downloadable `.pptx` file. The app does **not** rely on a browser renderer as the final artifact — PowerPoint is the deliverable.

---

## 2. User Personas

| Persona | Use Case |
|---|---|
| Analyst / Finance | Upload Excel with quarterly data → get investor-ready deck in 60 seconds |
| Startup Founder | Describe a pitch → get a 10-slide deck with structure, narrative, and design |
| Consultant | Upload client data + describe the storyline → deck auto-wires data into narrative |
| Educator | Describe a topic → get a structured lecture deck with speaker notes |

---

## 3. Input Modes (Core Feature)

### 3.1 Description-Only Mode
- Textarea for free-form description (up to 2000 characters)
- Optional controls:
  - Slide count target: 5 / 10 / 15 / Custom
  - Tone: Professional / Casual / Academic / Sales / Technical
  - Audience: Executive / General / Technical / Investor
  - Design theme: (see Section 6)
- AI generates: slide titles, body content, speaker notes, layout hints

### 3.2 Data File Mode (Excel / CSV / PDF)
- File upload (drag-and-drop or click)
- Accepted: `.xlsx`, `.xls`, `.csv`, `.pdf` (tabular PDFs)
- On upload, the app:
  1. Parses sheets / tables
  2. Displays a preview table with detected column types
  3. Suggests chart types per column pair (bar, line, pie, scatter, combo)
  4. User can override chart suggestions before generation
- AI generates: title slide, one slide per dataset/sheet, insight callout slides, summary slide

### 3.3 Combined Mode
- Both inputs active simultaneously
- Description field accepts: "Q3 Revenue Review — focus on regional performance and YoY comparison"
- App merges narrative from description with charts from data
- AI determines where in the deck to insert data slides vs. text slides

---

## 4. Core Output Requirements

### 4.1 Slide Types Generated
| Slide Type | Description |
|---|---|
| Title Slide | Bold hero title, subtitle, date, optional logo placeholder |
| Section Divider | Full-bleed color background with section name |
| Content Slide | Title + body (bullets or prose) with optional icon |
| Data Chart Slide | Title + chart (bar, line, pie, area, scatter, combo) |
| KPI Callout Slide | 2–4 large-number stat cards in a grid |
| Table Slide | Formatted data table, max 8 rows displayed, "see appendix" note if more |
| Comparison Slide | Two-column A vs. B layout |
| Quote / Pull Slide | Large italic quote, attribution |
| Timeline Slide | Horizontal or vertical milestone layout |
| Thank You / CTA Slide | Closing slide with contact info placeholder |

### 4.2 Chart Types Supported
- Bar (grouped, stacked)
- Line (single, multi-series)
- Area
- Pie / Donut
- Scatter
- Combo (bar + line on dual axis)

Chart type selection logic:
- Time-series columns → Line or Area
- Categorical comparisons → Bar
- Part-of-whole → Pie / Donut
- Two continuous variables → Scatter
- Revenue + Growth % together → Combo

### 4.3 Output File
- Format: `.pptx` (pptxgenjs)
- Slide size: 16:9 (10" × 7.5")
- Embedded fonts: Arial / Calibri (safe cross-platform)
- All charts embedded as native pptx chart objects (editable in PowerPoint)
- Speaker notes included on every content slide

---

## 5. AI Generation Pipeline

### 5.1 Description → Slide Structure
```
User Input → Claude API (outline generation) → JSON slide manifest → pptxgenjs renderer → .pptx
```

**Outline Prompt Contract** (Claude returns structured JSON):
```json
{
  "title": "string",
  "theme": "string",
  "slides": [
    {
      "index": 1,
      "type": "title | content | chart | kpi | comparison | timeline | divider | closing",
      "title": "string",
      "body": ["bullet 1", "bullet 2"],
      "speaker_notes": "string",
      "chart": null | { "type": "bar|line|pie|scatter", "data_ref": "sheet_name or null" },
      "layout_hint": "two_col | hero | grid_2x2 | full_bleed"
    }
  ]
}
```

### 5.2 Data File → Chart Manifest
- Excel/CSV parsed server-side (SheetJS / papaparse)
- Claude receives: column names, sample rows (first 10), data types
- Claude returns: chart recommendations per sheet with axis assignments
- User sees preview of chart suggestions before triggering generation

### 5.3 Combined Mode Merge
- Claude receives both the description outline AND chart manifest
- Produces a merged slide manifest with `data_ref` fields wired to actual sheet data

---

## 6. Design Theme System

### 6.1 Built-in Themes
| Theme | Primary | Secondary | Accent | Best For |
|---|---|---|---|---|
| Midnight Executive | `#1E2761` | `#CADCFC` | `#FFFFFF` | Finance, Corporate |
| Coral Energy | `#F96167` | `#F9E795` | `#2F3C7E` | Startups, Marketing |
| Forest & Moss | `#2C5F2D` | `#97BC62` | `#F5F5F5` | Sustainability, NGO |
| Charcoal Minimal | `#36454F` | `#F2F2F2` | `#212121` | Technical, SaaS |
| Warm Terracotta | `#B85042` | `#E7E8D1` | `#A7BEAE` | Consulting, Strategy |
| Ocean Gradient | `#065A82` | `#1C7293` | `#21295C` | Healthcare, Research |
| Berry & Cream | `#6D2E46` | `#A26769` | `#ECE2D0` | Creative, Brand |

### 6.2 Custom Theme Input
- User can supply 3 hex color codes (primary, secondary, accent)
- App validates contrast ratios (WCAG AA minimum)
- Logo upload (PNG/SVG) → placed on title slide and optionally on every slide footer

---

## 7. Unique / Out-of-the-Box Features

These are the differentiators. Build these after core flow is stable.

---

### 7.1 🔁 "Regenerate This Slide" — Slide-Level AI Iteration
- Each slide in the preview has a **Regenerate** button
- Opens a micro-prompt: "Make this slide more visual" / "Simplify this" / custom instruction
- Re-runs Claude only on that slide's JSON node and re-renders just that slide
- **Why it's useful:** Users rarely want to redo everything — they want to fix one slide without losing the rest

---

### 7.2 📊 Smart Data Insight Callouts
- After parsing data, Claude identifies 2–3 "insight sentences" from the data automatically
- Example: "Revenue grew 34% YoY in Q3 — fastest quarter in 3 years"
- These become auto-generated "Insight Callout" slides inserted after each chart slide
- User can edit or delete them
- **Why it's useful:** Turns raw data slides into narrative, which is what executives actually want

---

### 7.3 🎙️ Presenter Mode Export
- After `.pptx` is generated, offer a second export: **Presenter Script**
- Downloads a `.docx` file with slide thumbnails (as text headers) + full speaker notes formatted as a speaking script
- Claude rewrites the bullet speaker notes into flowing prose
- **Why it's useful:** Gamma doesn't do this. It's a full presentation prep tool, not just a deck generator

---

### 7.4 🔄 "Remix as Different Audience"
- One-click button: re-generate the same deck for a different audience
- Options: "Make this Executive Summary (5 slides)" / "Make this Technical Deep Dive" / "Make this Sales Pitch"
- Claude receives the original manifest + audience instruction and compresses/expands/reframes
- **Why it's useful:** One data set, three decks. Massive time save for consultants

---

### 7.5 🧠 Anomaly Highlight Mode (Data Files)
- When a data file is uploaded, Claude scans for statistical anomalies: outliers, sudden drops, zero values, sign changes
- Flags these on the chart slide with a callout annotation (e.g., a red arrow + label: "⚠️ Dip in March — check source data")
- User can suppress individual flags before export
- **Why it's useful:** Presenters often embarrass themselves when they don't notice a bad data point. This catches it before the room does

---

### 7.6 📎 "Drop a Competitor Deck" — Reverse-Engineer Mode
- User uploads an existing `.pptx`
- App extracts its structure (slide count, types, section flow)
- Offers: "Generate a response deck" or "Match this structure with my content"
- Claude uses the extracted structure as a template skeleton
- **Why it's useful:** Sales teams rebuilding pitch decks after seeing a competitor's is a real, common workflow

---

### 7.7 🌐 Multi-Language Output
- Language selector (20+ languages) applied before generation
- All slide text, speaker notes, and chart labels generated in the selected language
- RTL support for Arabic / Hebrew (text direction flag passed to pptxgenjs)
- **Why it's useful:** Global teams. Gamma's localization is weak

---

### 7.8 📅 "Weekly Report" Scheduled Mode *(v2 feature, design now)*
- User saves a "report template": which Excel columns map to which slide, which chart type, which theme
- Template stores the Claude prompt skeleton with data placeholders
- On next upload of a new week's Excel → one-click regeneration against the saved template
- **Why it's useful:** Finance and ops teams produce the same deck structure every week. Automate the rebuild

---

## 8. Application Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Hero, feature highlights, CTA to start |
| `/create` | Builder | Main input UI (all 3 modes) |
| `/preview/:id` | Deck Preview | Slide-by-slide preview with per-slide controls |
| `/export/:id` | Export | Download .pptx, optional presenter script |
| `/templates` | Templates | Gallery of 10+ pre-built deck structures |
| `/history` | History | Previously generated decks (localStorage or DB) |

---

## 9. Technical Architecture

### 9.1 Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **File parsing (client-side):** SheetJS (`xlsx`) for Excel, papaparse for CSV
- **State:** Zustand for builder state, React Query for API calls
- **Preview renderer:** Render slide JSON as HTML canvas previews (not pptx — just for visual feedback)

### 9.2 Backend (Next.js API Routes)
- `/api/generate-outline` — Takes description + options → returns slide JSON via Claude API
- `/api/parse-data` — Takes file buffer → returns parsed sheet data + chart suggestions
- `/api/generate-pptx` — Takes final slide manifest → builds and returns `.pptx` binary via pptxgenjs
- `/api/regenerate-slide` — Takes single slide + instruction → returns updated slide JSON
- `/api/remix` — Takes manifest + audience target → returns remixed manifest

### 9.3 AI Integration
- Model: `claude-sonnet-4-20250514`
- All Claude calls use structured JSON output (instruct model to return only JSON, no markdown fences)
- System prompt enforces: slide count limits, JSON schema, language, tone
- Token budget per call: max_tokens 2000 for outlines, 500 for single-slide regeneration

### 9.4 File Handling
- Excel/CSV parsed in the browser using SheetJS / papaparse (no server upload needed for parsing)
- Only the **extracted JSON data** is sent to the API (not raw file bytes) — keeps payloads small
- PDF parsing: server-side via `pdf-parse` npm package
- Generated `.pptx` streamed as a binary response with `Content-Disposition: attachment`

### 9.5 Storage (MVP: Stateless)
- No database required for MVP
- Deck manifests stored in browser localStorage with a UUID key
- History page reads from localStorage
- v2: optional Supabase / PlanetScale for saved templates and history sync

---

## 10. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Time to first slide preview | < 8 seconds (description mode) |
| Time to .pptx download | < 15 seconds end-to-end |
| Max Excel file size | 10 MB |
| Max rows parsed per sheet | 10,000 (charts sample to 500 points) |
| Supported browsers | Chrome 110+, Firefox 110+, Safari 16+, Edge 110+ |
| Mobile support | Responsive layout; generation supported, but preview is desktop-optimized |
| WCAG compliance | AA minimum for all UI chrome |

---

## 11. Out of Scope (v1)

- Real-time collaboration / multiplayer editing
- Google Slides export
- Live data connections (Google Sheets API, etc.)
- Custom animation / transitions in output (pptxgenjs limitation)
- Image generation / AI images embedded in slides
- Account system / auth (localStorage-first for MVP)

---

## 12. Success Metrics

| Metric | Target (30 days post-launch) |
|---|---|
| Decks generated | 500+ |
| % users who download the .pptx | > 70% |
| % users who use "Regenerate Slide" | > 40% |
| Avg slides per deck | 8–12 |
| % combined mode usage | > 25% |

---

## 13. MVP Scope (What Cursor Should Build First)

**Phase 1 — Core Loop (Build this first):**
1. `/create` page with description input + file upload
2. Claude outline generation → slide JSON
3. Excel/CSV parse → chart manifest
4. pptxgenjs renderer → .pptx download
5. Basic slide preview (HTML-based, not pixel-perfect)
6. 3 built-in themes

**Phase 2 — Polish:**
7. Per-slide regeneration
8. Insight callout auto-generation
9. Presenter script export
10. Full theme system (7 themes + custom)

**Phase 3 — Differentiators:**
11. Remix-as-different-audience
12. Anomaly highlight mode
13. Reverse-engineer competitor deck
14. Multi-language output

---

## 14. Key Prompts to Implement (Copy These Exactly)

### Outline Generation System Prompt
```
You are a presentation architect. Given a description, generate a JSON slide manifest. 
Return ONLY valid JSON — no markdown, no explanation, no backticks. 
Follow this schema exactly: [insert schema from Section 5.1].
Slide count: {target}. Tone: {tone}. Audience: {audience}. Language: {language}.
Never generate more than {max_slides} slides. Always include a title slide and a closing slide.
```

### Data Chart Recommendation System Prompt
```
You are a data visualization expert. Given column metadata and sample rows, 
recommend chart types for each column pair. Return ONLY valid JSON.
Schema: { "recommendations": [{ "sheet": string, "x_col": string, "y_col": string, 
"chart_type": "bar|line|pie|scatter|combo", "rationale": string }] }
Prioritize clarity over variety. If in doubt, use bar charts.
```

### Insight Callout Generation Prompt
```
You are a data analyst writing for executives. Given this dataset summary, 
write 2-3 insight sentences as a JSON array of strings. 
Each insight must be specific, numeric where possible, and max 20 words.
Return ONLY a JSON array. No explanation.
```

---

## 15. Dependencies to Install

```bash
# Core
npm install pptxgenjs xlsx papaparse

# AI
npm install @anthropic-ai/sdk

# PDF parsing (server-side)
npm install pdf-parse

# UI
npm install @radix-ui/react-dialog @radix-ui/react-tabs lucide-react
npx shadcn-ui@latest init

# State
npm install zustand @tanstack/react-query

# Utilities
npm install uuid file-saver
npm install -D @types/file-saver
```

---

*PRD v1.0 — SlideForge. Prepared for Cursor development. Start with Section 13 Phase 1.*