# RationSaathi API (`@repo/api`)

Express + TypeScript + SQLite (`node:sqlite`). It serves the RationSaathi PWA. The full endpoint reference, with request/response shapes and UI behaviour, is in [`docs/FRONTEND_SPEC.md` §12](../../docs/FRONTEND_SPEC.md#12-api-reference). The types are in [`packages/shared/src/types.ts`](../../packages/shared/src/types.ts).

## Run

```bash
pnpm install
pnpm setup:assets          # downloads tesseract eng+hin models and Noto fonts (needs the tesseract binary for OCR)
cp apps/api/.env.example apps/api/.env
pnpm build:shared
pnpm dev:api               # http://localhost:5000/api/v1   (GET /meta shows capabilities)
pnpm test                  # 37 tests: engine, principles, full API flows, photo masking, sync
```

Requirements: Node ≥ 22.13 (for `node:sqlite`). Optional: `tesseract` ≥ 5 for local OCR and Aadhaar masking. Without it, photo upload needs `?userConfirmedNoIds=true` (see below). Optional: `ANTHROPIC_API_KEY` for the cloud AI features.

## Environment

| Var | Default | Meaning |
|---|---|---|
| `PORT` | 5000 | |
| `FRONTEND_URL` | http://localhost:3000 | Comma-separated CORS origins |
| `DATA_DIR` | ./data | SQLite file + masked photos (gitignored) |
| `ANTHROPIC_API_KEY` | – | Enables cloud AI. Empty = fully local/rule-based |
| `AI_MODEL` | claude-opus-5-5 | |
| `AI_FALLBACKS` | true | Server-side refusal fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`) |
| `TESSERACT_BIN`, `TESSDATA_DIR`, `OCR_LANGS` | tesseract, ./tessdata, eng+hin | Local OCR |
| `FONT_DIR` | ./assets/fonts | PDF fonts |
| `ADMIN_TOKEN` | – | Required for `PUT/DELETE /grievance-channels/:id` (header `X-Admin-Token`) |
| `RULE_DEFAULTS_LAST_VERIFIED` | – | Date someone verified the NFSA defaults against nfsa.gov.in |
| `QUALITY_*` | see `.env.example` | Photo quality-gate thresholds |

## Layout

```
src/
  app.ts, index.ts, config.ts
  db/            schema (index.ts), channel seeds (seed.ts)
  lib/           http envelope + errors, zod schemas
  middleware/    device-token auth, admin auth, error handler
  repo/          households, checks+records, drafts, channels
  services/      image (quality/mask), ocr (tesseract), photos (upload pipeline),
                 reports, grievance (+filing), export (html/pdf), ai/claude.ts, ai/tasks.ts
  routes/        meta, devices, data, photos, ai, reports, channels, sync
tests/           shared-engine.test.ts, api.test.ts
```

## Auth model
There are no user accounts. `POST /devices` returns a random 256-bit bearer token, and only its SHA-256 is stored. All data is scoped to that device. `DELETE /devices/me` hard-deletes every row and photo file for the device.

## Privacy & AI data flows (Spec §6–7)

**Never stored on the server:** ration card numbers (the API has no field for them), Aadhaar numbers and VIDs (redacted from all text and masked in photos), and original photos (processed in memory only).

**Photo pipeline** (`services/photos.ts`): decode → auto-rotate, ≤ 2000 px, re-encode JPEG, strip EXIF/GPS → quality gate (blur, darkness, overexposure, contrast, size) → local tesseract OCR → find Aadhaar/VID numbers (Verhoeff-checked) → black boxes → store **only the masked JPEG** → cache the redacted OCR text.
Masking is best-effort: it depends on OCR reading the number. If local OCR is unavailable, the upload is refused with `MASKING_UNAVAILABLE` until the user confirms no ID is visible (`?userConfirmedNoIds=true`). The photo is then stored with `maskingPerformed: false`.

**What each AI call sends to the third-party service (Anthropic).** Calls happen only when the request has `allowCloud: true`, which the client sends after the user's explicit consent:

| Endpoint | Data sent | Not sent |
|---|---|---|
| `POST /ai/ocr` | The stored **masked** JPEG; period and today's date | Device id, household data, card number |
| `POST /ai/extract-text` | Pasted text **after** Aadhaar/VID redaction; period | Anything else |
| `POST /ai/voice/parse` | Transcript (redacted); language; period; entitlement figure | Audio (never reaches the server) |
| `POST /ai/translate` | The report text, the grievance description, or the given evidence text (these contain period, quantities, FPS name/number, report id) | Card number, Aadhaar |
| `POST /ai/chat` | Chat messages (redacted) | Household data |

All cloud responses are schema-constrained (structured outputs), validated with zod, and stored as **drafts**. Totals and fractions are computed in code. Translations are neutrality-checked and number-checked. Chat replies are neutrality-checked and replaced with a neutral redirect if they fail. Logs record method, path, status and timing only, never bodies.

## Neutrality guard
`checkNeutrality()` (`packages/shared/src/guards.ts`) flags words that state or imply wrongdoing in English, Hinglish and ten Indic scripts. It is applied to:
- report and grievance templates (unit-tested to always pass)
- household-written notes and photo captions (422)
- SMS/receipt text (kept verbatim, with a warning)
- edited grievance descriptions (422)
- AI translations (warning on the draft, 422 on confirm)
- chatbot replies

## Known limitations
- The directory seeds and the NFSA "last verified" date are **unverified**; see `docs/PLAN.md` §8.
- PDF export supports English and Hindi. Other languages export as HTML (print to PDF in the browser handles every Indic script).
- Read-back text for drafts is generated in English or Hindi.
