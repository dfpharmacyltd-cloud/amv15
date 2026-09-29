# Analytical Method Validation (AMV) Suite

Pharmaceutical Analytical Method Validation protocol and report generator for
Westcoast Pharmaceutical Works Ltd. Generates ICH Q2(R2) / USP `<1225>` / USP `<1226>`
compliant documents on screen and exports them to Microsoft Word (`.docx`).

## Supported validation methods

| Method | Document | Status |
| --- | --- | --- |
| Assay by HPLC | 15 sections, 8 pages | Working |
| Related Substances (Organic Impurities) | 16 sections | Working |
| Dissolution | Full monograph format | Working |
| Microbial Limit Test (MLT) | Full format | Working |

Each method produces both a **Protocol** (blank, acceptance criteria only) and a
**Report** (calculated values with statistics), in Executive Blue or Simple
(no colour) format, with configurable font family, font size and footer sign-off dates.

## Features

- Built-in compendial monograph library for all four methods
- Seeded data generation, so the same product always produces the same values
- All statistics (%RSD, SD, regression, recovery, LOD/LOQ) are recalculated from the
  raw rows, never hard-coded
- FPS / MOA PDF extraction to override monograph defaults
- Pre-output compliance and contamination audit gate
- Major method change detection with mandatory justification
- Word export via the `docx` library

## Run locally

Prerequisites: Node.js 18+

```bash
npm install
npm run dev
```

Open the URL printed in the terminal.

### Optional Gemini API key

Live monograph lookup uses the Gemini API. Copy `.env.example` to `.env.local` and set:

```
GEMINI_API_KEY="your-key-here"
```

The app works without a key, using the built-in monograph library.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (`tsx server.ts`) |
| `npm run build` | Build the client (Vite) and bundle the server |
| `npm run start` | Run the production build |
| `npm run lint` | Type-check with `tsc --noEmit` |

## Project structure

```
src/
  App.tsx                  Main application state and method switching
  types.ts                 Document data types for all four methods
  components/              Document viewers, input form, modals
  services/
    pharmaDatabase.ts          Assay monographs + assay document builder
    rsPharmaDatabase.ts        Related Substances monographs + builder
    dissolutionPharmaDatabase.ts
    mltPharmaDatabase.ts
    pharmaMathEngine.ts        Seeded generation of chromatographic data
    calculations.ts            Statistics and recalculation engines
    mathUtils.ts               Assay recalculation + shared math
    *DocxGenerator.ts          Word export per method
    complianceAuditGate.ts     Pre-output audit
server.ts                  Express server used by dev and production
```

## Notes for future changes

- Monograph data lives in `src/services/*PharmaDatabase.ts`. To add a product, add an
  entry to the relevant library rather than editing the document builders.
- A document builder must return the **full nested shape** the viewer expects
  (`chromatographicConditions`, `methodSummary`, `lodLoq`, `stats`, ...). A flattened or
  partial object crashes the viewer with a blank screen — this is what previously broke
  the Assay and Related Substances tabs.
