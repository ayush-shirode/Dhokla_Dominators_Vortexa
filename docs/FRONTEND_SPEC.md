# RationSaathi — Frontend Build Specification

**Audience:** the engineer / AI agent building the web frontend in `apps/web`.
**Backend:** `apps/api` (Express + TypeScript, SQLite), already specified below and built in parallel.
**Shared code:** `packages/shared` (`@repo/shared`) — domain types, the deterministic entitlement engine, report/grievance text templates, the neutral-language guard, sensitive-ID redaction, the offline text extractor and voice parser, static data (states, languages, FAQ) and a typed API client. **Use it; do not re-implement any of it.**

> Read this whole document before writing code. Section 1 holds rules that override every other section. If something here conflicts with your instinct for "a nicer UX", the rule wins.

**Backend status:** implemented and tested (`pnpm test`: 37 passing). Run it with `pnpm dev:api`. Every endpoint in §12 exists and behaves as described. When in doubt, the source of truth is `packages/shared/src/types.ts` (types) and `apps/api/tests/api.test.ts` (executable examples of every flow).

**Spec revisions after the backend build** (already folded into the sections below):
- r1: A neutral-language failure on a record is a hard 422 only for household-written text (`note`, `photo` caption). Verbatim `sms`/`receipt` text is stored with a `NEUTRALITY_TERMS` warning, because official SMS can contain phrases like "beware of fraud calls".
- r2: Two new warning codes: `NUMBERS_CHANGED` and `CLOUD_UNAVAILABLE_LOCAL_USED` (§12.13).
- r3: AI translation is only for languages other than `en`/`hi`. English and Hindi are always generated from templates, without AI. On confirm, every number in the translation must match the original, or the server returns 400.
- r4: Read-back text (`draft.readBack`) is produced in Hindi when the request language is `hi`, otherwise in English.

---

## Table of contents

1. [Non-negotiable rules for the UI](#1-non-negotiable-rules-for-the-ui)
2. [Stack, repo layout and how to run](#2-stack-repo-layout-and-how-to-run)
3. [Architecture: offline-first](#3-architecture-offline-first)
4. [Screens and user flows](#4-screens-and-user-flows)
5. [AI-assisted flows (OCR, paste, voice, translation, chat)](#5-ai-assisted-flows)
6. [Wording, labels and neutral language](#6-wording-labels-and-neutral-language)
7. [Internationalisation](#7-internationalisation)
8. [Accessibility and low-literacy design](#8-accessibility-and-low-literacy-design)
9. [Privacy and consent UI](#9-privacy-and-consent-ui)
10. [Visual design guidance](#10-visual-design-guidance)
11. [Using `@repo/shared`](#11-using-reposhared)
12. [API reference](#12-api-reference)
13. [Error codes → UI behaviour](#13-error-codes--ui-behaviour)
14. [Acceptance checklist](#14-acceptance-checklist)
15. [Explicitly forbidden](#15-explicitly-forbidden)

---

## 1. Non-negotiable rules for the UI

These come from the product spec's core principles. Every screen must respect them.

| # | Rule | What it means in the UI |
|---|------|-------------------------|
| P1 | **Entitlement rule is explicit and user-confirmed.** | Picking AAY/PHH *pre-fills* the rule, but the user must see it and press a confirm button ("Use this rule"). Until then, show no shortfall figure and no report button. Any edit to card type, members, kg or basis un-confirms it, and the user must confirm again. Always show the formula (e.g. `5 kg × 4 members = 20 kg`), the source link and the "last verified" date (or "not verified" when `null`). |
| P2 | **Arithmetic never depends on AI.** | All totals and differences come from `computeSummary()` in `@repo/shared` (offline) or `GET /checks/:id/summary` (same code on the server). Never display a number produced by an AI response as a total. Show the line-by-line arithmetic (`summary.arithmetic`). |
| P3 | **Every record is evidence-linked.** | The record form always asks for evidence (receipt no. / SMS text / photo / note / "I have no evidence"). Evidence is shown next to the record everywhere, including the report. Records with `none` evidence show an **Unrecorded** chip and are not counted. |
| P4 | **AI output is always a draft.** | OCR, pasted-text extraction, voice parsing and translation return a *draft*. Show every extracted value in an editable review screen; nothing is saved until the user taps Confirm. Low-confidence fields (`confidence < LOW_CONFIDENCE_THRESHOLD`, currently 0.75) must be visually highlighted and need an explicit "I checked this against my receipt" tick. Otherwise the record is saved as **Unclear** and not counted. |
| P5 | **Labels describe data, not causes.** | Only these labels exist: **Shortfall, Late, Unrecorded, Unclear**. No icon, colour, tooltip or copy may suggest *why* (no "suspicious", "missing stock", "dealer", red-alert sirens, etc.). |
| P6 | **Neutral report language.** | The report and grievance text come from server/shared templates. Show the static "possible causes" list and the disclaimer wherever a shortfall is shown. User-typed notes and edited descriptions are checked with `checkNeutrality()` as the user types. Flagged words get an inline, non-judgmental hint ("Please describe what you received, not who caused it"). The server rejects them with `NEUTRALITY_CHECK_FAILED`. |
| P7 | **No automatic submission.** | The grievance screen pre-fills fields with copy buttons and opens the real portal in a **new tab** (`target="_blank" rel="noopener noreferrer"`). Never embed (`iframe`), proxy, scrape or visually imitate any government login, OTP, or grievance form. Never ask for an Aadhaar number or OTP. |
| P8 | **No supply-chain tracing.** | No screen implies visibility into warehouses, procurement, or a shop's stock. No maps of grain flow, no "shop score", no rankings. |

Also:
- Never name, rate, rank or flag a shop/dealer/official. The FPS name/number appear **only** as form fields the user copies into their own grievance.
- The app is a helper, not legal advice. Show a short "This is not legal advice" note in Settings → About and on the grievance screen.

---

## 2. Stack, repo layout and how to run

Already scaffolded (keep it):

```
apps/web        Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + lucide-react
apps/api        Express + TypeScript API on :5000 (being built in parallel)
packages/shared @repo/shared — types, engine, templates, API client (compiled to dist/)
```

- **Read `apps/web/AGENTS.md` first.** This Next.js version has breaking changes; consult `node_modules/next/dist/docs/` before using any Next API.
- Run: `pnpm install`, then `pnpm build:shared` (or `pnpm --filter @repo/shared dev` to watch), then `pnpm dev`. Web: http://localhost:3000, API: http://localhost:5000/api/v1.
- Env for web: `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1`.
- The app is overwhelmingly **client-side** (offline data, camera, mic, speech). Make the main app pages client components; don't rely on server components for user data. Treat it as an installable **PWA**: manifest + service worker that caches the app shell, fonts and static assets so the app opens with no network.
- Suggested libraries (your call): `idb` or `dexie` for IndexedDB; a small i18n layer (e.g. `next-intl` client mode or your own JSON catalogs); `tesseract.js` (optional, see §5.1). Avoid heavy UI kits; Tailwind + a few hand-made components is enough.
- Mobile-first: design for a 360 px wide Android phone, then scale up. Must also work on desktop.

---

## 3. Architecture: offline-first

Rural connectivity is unreliable. The core flow — set up the household, add records, see the discrepancy — **must work with no network at all.**

```
┌──────────── Browser / PWA ─────────────┐          ┌──────── apps/api ────────┐
│ UI (React)                              │          │ Device auth (bearer)     │
│   │                                     │  HTTPS   │ Households/checks/records│
│ Local store (IndexedDB) ◄─ source of    │ ───────► │ Photos (masked only)     │
│   truth on the device                   │          │ AI drafts (OCR/voice/    │
│   │                                     │          │   translate/chat)        │
│ Sync queue (outbox) ── POST /sync/batch │          │ Reports + exports (PDF)  │
│ @repo/shared engine: computeSummary()   │          │ Grievance drafts/filings │
│   checkNeutrality(), extractFromText(), │          │ Channel directory        │
│   parseVoiceTranscript(), templates     │          └──────────────────────────┘
└─────────────────────────────────────────┘
```

### 3.1 Device identity
- On first launch call `POST /devices` and store `{deviceId, token}` in IndexedDB. Send `Authorization: Bearer <token>` on every other call.
- If offline at first launch, the app still works locally. Register when the network returns.
- If any call returns `401 UNAUTHORIZED` (e.g. the server DB was reset), register again and push the full local state with `/sync/batch`.

### 3.2 Local data model
Mirror the shared types: `Household`, `Check`, `DistributionRecord`, plus local-only fields:
- `rationCardNo` (string, **local only, never sent to the server**), stored on the local household.
- `syncState: 'synced' | 'pending' | 'error'` per entity.
- Photos captured offline: keep the Blob locally in a `pendingPhotos` store until uploaded. Never keep the unmasked original after a successful upload. Replace it with the masked server copy (`GET /photos/:id`).

**IDs are generated on the client** (`crypto.randomUUID()`), and all create/update calls are idempotent `PUT /…/:id`. This is what makes offline queueing safe.

### 3.3 Sync
- Every local mutation goes into an **outbox** as a `SyncOperation` (`{opId, entity, action, id, body, clientUpdatedAt}`).
- When online, flush the outbox in order with `POST /sync/batch` (max 200 ops per call). Per-op results:
  - `applied` → mark synced and replace the local copy with `entity` (server-computed `labels`, `updatedAt`).
  - `stale` → the server has a newer copy. Replace the local copy with `entity` and show a small "Updated from another device" toast.
  - `error` → keep it in the outbox, mark the entity `syncState: 'error'`, and show the error message on that item (e.g. a neutrality failure on a note).
- On app start (online), call `GET /sync/snapshot?since=<lastServerTime>` and merge.
- Show a sync indicator in the header: *Saved on this phone* (offline/pending) ↔ *Backed up* (synced). Never block the user because of sync.
- Order matters: a record's check and household must be synced before the record. Keep the outbox FIFO.

### 3.4 What needs the network
| Feature | Offline behaviour |
|---|---|
| Rule defaults, entitlement, labels, summary | Works (shared constants + engine). |
| Paste SMS/receipt text → draft | Works via `extractFromText()` (shared, rule-based). The server/cloud is only used if the user asks for AI help with regional-script text. |
| Voice → draft | Speech-to-text needs the browser engine (Chrome on Android may need network). The transcript → draft parsing works offline via `parseVoiceTranscript()`. If STT is unavailable, show the typed/tap input instead. |
| Photo OCR | Queue the photo and show "Will read this photo when you are online". Optional on-device `tesseract.js` (see §5.1). |
| Report generation | Preview works offline: `renderReportText(buildReportSnapshot(...))` from shared. The **official** snapshot (with id + hash) and PDF export need the server. Label the preview "Preview — not yet saved". |
| Translation, chatbot AI | Need network. The chatbot's FAQ answers work offline (`matchFaq()` from shared). |
| Grievance fields + copy | Work offline (description from `generateGrievanceDescription()`). Opening the portal obviously needs network. |

---

## 4. Screens and user flows

Suggested routes (App Router). Names are suggestions; the flows are requirements.

```
/                         Home — households & period checks
/onboarding               First run: language, what the app does / doesn't do, privacy
/household/new            Household & rule setup (also /household/[id]/edit)
/check/[checkId]          Period ledger: records + live discrepancy summary   ← main screen
/check/[checkId]/record/new        Add record (manual)  (+ /record/[recordId] edit)
/check/[checkId]/capture           Photo → OCR draft review
/check/[checkId]/paste             Paste SMS/receipt text → draft review
/check/[checkId]/voice             Voice entry → read-back → confirm
/check/[checkId]/report            Generate/view report, read aloud, translate, export
/check/[checkId]/grievance         Grievance helper + read-back + filing reference
/channels                 Grievance channel directory (by state)
/help                     Plain-language explainer chatbot + FAQ
/settings                 Language, AI consent, data export/delete, sync, about
```

A persistent bottom nav on mobile: **Home · Help · Settings**. Inside a check, show a 4-step progress strip: **1 Rule → 2 Records → 3 Report → 4 Grievance**.

### 4.1 Onboarding (`/onboarding`)
1. **Language picker** first, before any text-heavy screen. Big tiles with each language's native name (`SUPPORTED_LANGUAGES[].nativeName`) and a speaker icon that reads the name aloud.
2. Three short cards, each with an illustration and a "listen" button:
   - "Compare what your card entitles you to with what you received."
   - "Every number is plain arithmetic you can check. RationSaathi never decides *why* there is a difference."
   - "RationSaathi prepares your complaint. **You** file it yourself on the official website with your own OTP."
3. Privacy card: data stays on the phone and is backed up to our server without your ration card number. AI features send data to an AI service only when you tap them, and you will be asked each time (or you can allow it in Settings).
4. Register the device (silently, in the background).

### 4.2 Home (`/`)
- List of households (usually one) → each with its period checks (newest first), showing period (e.g. "October 2026"), status chip (`open` / `report ready` / `filed`), and a headline figure computed locally: e.g. "Received 16 kg of 20 kg".
- Primary button: **Check a month**. Pick a household (or create one), then pick a month (default: current month), then go to `/check/[id]`.
- Empty state: an illustrated card, "Start by telling us about your ration card", leading to `/household/new`.
- Example data: offer a "Try with example data" link that creates a clearly-marked sample household/check (label it **Example** everywhere, with a one-tap "Clear example" action). Do not pre-load example data by default.

### 4.3 Household & rule setup (`/household/new`, `/household/[id]/edit`)
Fields:
| Field | Control | Notes |
|---|---|---|
| Label | text | Default "My household". |
| Card type | 3 large radio tiles: **Antyodaya (AAY)**, **Priority Household (PHH)**, **Other / state scheme** | Each tile has a one-line explainer and a listen icon. |
| Members on card | stepper (− / number / +), 1–30 | Large buttons. |
| Rule (kg) | numeric input, step 0.5, 0–100, max 3 decimals | Pre-filled from `RULE_DEFAULTS` on choosing AAY/PHH. |
| Rule basis | segmented control: **per member** / **per family** | Pre-filled. |
| State | searchable select from `INDIAN_STATES` | Used for grievance and the channel directory. |
| District | text | |
| FPS (shop) number | text | Optional; shown on the grievance form. |
| FPS (shop) name | text | Optional. |
| Ration card number | text, masked display | **Local only.** Show a lock icon and "Stays on this phone". Never include it in API bodies. |

**Rule card** (the heart of P1). Shown below the rule inputs:
```
┌ Rule used for the calculation ───────────────────────────────┐
│ 5 kg × 4 members = 20 kg per month                           │
│ Source: National Food Security Act 2013 — nfsa.gov.in ↗      │
│ Last verified: not verified yet  (or: 2026-10-01)            │
│ State schemes may give more. Edit the figure if yours        │
│ differs.                                                     │
│ [ ✓ Use this rule ]                (or ✓ Confirmed 11 Oct)   │
└──────────────────────────────────────────────────────────────┘
```
- If the user changes the kg or basis away from the default, show "Edited by you" next to the source. Keep the source text, and for CUSTOM ask for a free-text source note ("Where does this figure come from? e.g. state scheme letter").
- The **Use this rule** button sets `ruleConfirmed: true`. Any later change to cardType/members/perUnitKg/basis flips it back to unconfirmed (do it locally too, mirroring the server).
- Save → `PUT /households/:id`.

### 4.4 Period ledger (`/check/[checkId]`) — main screen
Two panes on desktop (ledger left, summary right); stacked on mobile (summary card on top, collapsed to the headline, expandable).

**Header:** household label, period picker (changing the month creates or opens another check), rule summary line (`PHH · 5 kg × 4 = 20 kg`) with an *Edit rule* link. If the rule is not confirmed, show a blocking banner: "Confirm the rule before we can compare" with a button to the rule card.

**Records list** (sorted by date). Each row shows:
- date, quantity (`formatKg`), commodity icon (if any),
- evidence line: type icon + content preview (reference no. / first 60 chars of SMS / photo thumbnail / note),
- label chips from `record.labels` (or computed locally): `Unrecorded`, `Unclear`, `Late` (with "before/after the month" sub-text). With no labels, show a neutral "Recorded" chip,
- a "not counted" note when `counted === false`, with the reason,
- edit and delete actions (delete asks for confirmation; records are editable until the user files; after filing, editing is still allowed but warn that the filed report won't change),
- `createdVia` badge: small mic or camera icon when the record came from voice/OCR.

**Add record** — one prominent button that opens a sheet with 4 big choices:
1. ✍️ **Type it** → manual form
2. 📷 **Photo of slip / SMS / note** → capture flow
3. 📋 **Paste SMS or receipt text** → paste flow
4. 🎤 **Say it** → voice flow

**Summary panel** (only when the rule is confirmed). Computed locally with `computeSummary()` and refreshed on every change:
- Three big figures: **Entitled** `20 kg` · **Received (counted)** `16 kg` · **Difference** `4 kg`.
- Arithmetic block (monospace) rendering `summary.arithmetic` lines exactly.
- Status box:
  - `shortfall` → "Difference of 4 kg below the entitlement" (neutral amber/brown, **not** alarm red),
  - `matches` → "Received quantity matches the entitlement",
  - `above_entitlement` → "Received 2 kg more than the entitlement (this can happen with advance or make-up deliveries)".
- Excluded records note: "2 records (6 kg) were not counted: 1 has no evidence, 1 is marked unclear."
- Always below it, the **possible causes** box using `POSSIBLE_CAUSES[lang]` and the `DISCLAIMER` text.
- Buttons: **Make report** → `/check/[id]/report`.

### 4.5 Record form (manual add / edit)
| Field | Control | Validation |
|---|---|---|
| Date | date picker defaulting to today if inside the period, else the 1st of the period | Required, `YYYY-MM-DD`, not in the future. If outside the period, show an inline hint: "This date is outside October 2026 — it will be marked Late (still counted)." |
| Quantity (kg) | big numeric keypad input, step 0.5 | 0–1000, max 3 decimals. 0 is allowed (a visit where nothing was given). |
| Commodity | optional chips: rice, wheat, coarse grains, mixed, other | Informational only, not used in arithmetic. |
| Evidence type | 5 tiles: Receipt number · SMS text · Photo · Note · No evidence | Required. |
| Evidence content | depends on type: receipt → text input "Slip / transaction number"; sms → textarea; photo → pick/attach an uploaded photo (thumbnail) with optional caption; note → textarea "What happened at this visit?"; none → no input, with the hint "This will be shown as Unrecorded and not counted" | Required for receipt/sms/note; `photoId` required for photo. Max 4000 chars. Run `checkNeutrality()` live on text, and `redactSensitiveIds()` before save; if it redacted something, tell the user "We removed a number that looked like an Aadhaar number". |
| Mark as unclear | checkbox "I'm not sure about this amount" | |

Save → write locally → outbox `PUT /records/:id` with `createdVia: 'manual'`, `confirmed: true`.

### 4.6 Report (`/check/[checkId]/report`)
- Show a **preview** generated locally (shared `buildReportSnapshot` + `renderReportText`) until the user taps **Save report**. That calls `POST /checks/:id/reports` and returns the immutable `Report` (version number, `contentHash`).
- Report language: `en` or `hi` are generated by templates (no AI). For other languages, see translation in §5.4.
- Report layout (render `report.snapshot` as structured UI; `report.text` is the plain-text equivalent):
  1. Title, period, household label, card type, members.
  2. Rule used + source + last verified + "confirmed by you on {date}".
  3. Records table: date, kg, evidence type, evidence content (photo thumbnails clickable), labels, counted?
  4. Arithmetic lines.
  5. Result sentence.
  6. Not-counted records explanation.
  7. Possible causes + disclaimer.
  8. Footer: report id, version, integrity hash (first 12 chars + "…"), generated at; and a "Filed: ref … on …" stamp if filed.
- Actions:
  - 🔊 **Read aloud**: `GET /reports/:id/readback?lang=xx`, then `speechSynthesis` segment by segment, with pause/stop and highlighting of the current sentence.
  - **Download PDF** (`format=pdf`, `en` and `hi`); **Download text** (`txt`); **Open printable page** (`html`, any confirmed language; print-to-PDF from the browser handles every Indic script correctly); **Copy text**.
  - Downloads need the auth header: `fetch` → blob → `URL.createObjectURL` → `<a download>`. Never put the token in a URL.
  - **Translate** (AI) — see §5.4.
- Earlier versions: a small "Previous versions" list (`GET /checks/:id/reports`).

### 4.7 Grievance helper (`/check/[checkId]/grievance`)
Needs a saved report. If there is none, prompt to save one first (the description is generated from it).

Top notice (always visible):
> RationSaathi fills in what the official grievance form asks for. It **cannot submit it**. The official site will ask for an OTP on your Aadhaar-linked phone, which only you can give. Copy each field across and file it yourself.

Fields (from `GET /checks/:id/grievance` → `copyFields`), each a read-only row with a big **Copy** button and a "Copied ✓" confirmation:
- State, District, Ration card number (from **local storage**, since the server returns `null`), FPS number, FPS name, Problem category (fixed: "Not getting NFSA quantity"), Problem description (multi-line).
- An **Edit details** link opens a small form → `PUT /checks/:id/grievance`.
- An **Edit description** option: allowed, live neutrality hints; the server rejects accusatory text (`NEUTRALITY_CHECK_FAILED`) and the UI shows which words to change. Offer "Restore generated text" (`POST /checks/:id/grievance/regenerate`).
- **Language advice** box from `languageAdvice`. If `portalAcceptsVernacular` is `null`, say: "We don't know whether this portal accepts complaints in {language}. English is the safest choice." Never silently auto-translate the description that will be copied.
- **Copy all fields** button (one block of `Label: value` lines).

**Read-back before filing (mandatory step):**
- Before the **Open official portal** button is enabled, the user must either play the read-back (`GET /checks/:id/grievance/readback` → TTS) to the end, or tick "I have read the description myself". Show a large play button with the text "Listen to what you will submit".

**Open the portal:**
- Button **Open official grievance portal ↗** uses `portal.url`, a real link with `target="_blank"` and `rel="noopener noreferrer"`. Under it, the note: "You will complete OTP and submission on the official site."
- Also list other channels for the user's state from `/grievance-channels?stateCode=XX` (helplines with `tel:` links, DGRO process note), each with its **source** link and **last verified** date, plus an "Unverified" badge when `verificationStatus !== 'verified'`.

**After filing:**
- Form: Reference number (required, 3–64 chars), Filed on (date, default today), Portal used (prefilled). Save → `PUT /checks/:id/filing`.
- Then show a green **Filed** stamp with the ref and date, a **Check status on the official site ↗** link (`portal.statusUrl` if present), and the check status becomes `filed`.
- Allow correcting (`PUT` again) or removing (`DELETE /checks/:id/filing`) the reference.

### 4.8 Channel directory (`/channels`)
- State selector, then a list of `GrievanceChannel` cards grouped by `kind` (Portal, Status check, Helpline, District Grievance Redressal Officer, State Food Commission, Other).
- Each card: name, value (link or `tel:`), notes, accepted languages (or "unknown"), source link, last verified date, verification badge.
- Footer: "This directory could not be fully verified. Check numbers on your state food department's website before relying on them."

### 4.9 Help / explainer chatbot (`/help`)
- Chat UI plus quick-question chips (from `FAQ` in shared: "What does Unrecorded mean?", "What happens after I file?", "What is a DGRO?", "Where do I find my FPS number?" …).
- Offline / no consent → answer from `matchFaq()` locally.
- Online → `POST /ai/chat`. Show `source`: answers from the FAQ show no badge; AI answers show a small "AI answer — explains process only" badge.
- If the user asks why they got less, or whether the shop cheated, the server returns `source: 'guardrail'` with a neutral redirect. Render it normally (no error styling).
- Each assistant message has a 🔊 read-aloud button.
- The chatbot never edits the report or the description. No "apply to report" buttons.

### 4.10 Settings (`/settings`)
- Language.
- **AI features**: three toggles, default **off** = "ask me each time": Read photos with AI (cloud) · Translate with AI (cloud) · Smarter voice & chat answers (cloud). Explain each in one sentence + what data is sent (see §9).
- Voice: speech rate slider, test voice button.
- Data: **Export my data** (JSON of local IndexedDB) · **Delete everything** (local wipe + `DELETE /devices/me`), with a double confirmation.
- Sync status and last backup time.
- About: version, "Not legal advice", rule source, link to the channel directory disclaimer.

---

## 5. AI-assisted flows

Common rules for every AI flow:
1. **Consent:** before the first cloud call of each kind, ask "Send this {photo/text} to an AI service to read it? It will not include your ration card number. Masked Aadhaar numbers are removed first." Offer [Send once] [Always allow] [No, I'll type it]. Pass `allowCloud: true` only after consent. With `allowCloud: false` the server uses local/rule-based processing.
2. **Draft review screen** (shared component `DraftReview`):
   - Source preview (the masked photo, or the pasted text / transcript) next to the editable fields.
   - Each field shows the value, a confidence indicator (high / check this) and the raw text it was read from.
   - Fields in `lowConfidenceFields` are outlined amber with "Please check this". The **Confirm** button requires either editing those fields or ticking "I checked these against my slip". If neither happens, the record is saved with `unclear: true` (tell the user it won't be counted).
   - `quantityFormula` (e.g. "3 kg (rice) + 2 kg (wheat) = 5 kg") is shown under the quantity. It is computed by code, not AI.
   - Doc type: show the detected type ("Looks like: SMS screenshot") with a dropdown to change it. The evidence type defaults to `suggestedEvidenceType`.
   - 🔊 button reads `draft.readBack.text`.
   - Buttons: **Confirm and save** → `POST /ai/drafts/:id/confirm` with the final `record` · **Discard** → `POST /ai/drafts/:id/reject`.
3. Never auto-advance, auto-save or auto-confirm, even if all confidences are high.

### 5.1 Photo → OCR (`/check/[id]/capture`)
1. Capture: `<input type="file" accept="image/*" capture="environment">`, plus "choose from gallery". Show framing tips: flat surface, good light, fill the frame, cover Aadhaar numbers if you can.
2. Optional client pre-check (cheap): reject images under 600 px on the short side.
3. Upload: `POST /photos` (multipart, field `image`). The server checks quality, masks Aadhaar/VID numbers, strips metadata, and stores only the masked JPEG.
   - `422 RETAKE_PHOTO` with `details.issues` (`blurry`, `too_dark`, `overexposed`, `low_contrast`, `too_small`) → show a friendly retake screen with a specific tip per issue. **Do not offer to continue with the bad photo** for OCR. The user may instead attach it as plain photo evidence ("Keep as evidence without reading it" → `POST /photos?skipQualityGate=true`).
   - `422 MASKING_UNAVAILABLE` → the server can't scan for ID numbers. Ask: "Please make sure no Aadhaar number is visible (cover it or crop it)", then re-upload with `?userConfirmedNoIds=true`.
   - On success you get `Photo` with `sensitiveIdsMasked`. If > 0, show "We blacked out {n} ID number(s) before saving".
4. Read: `POST /ai/ocr {photoId, checkId, allowCloud}` → `AiDraft (kind 'ocr')`. If the result has `retakeSuggested`, show the reasons and offer **Retake** first (still allow manual entry).
5. Review → confirm (see common rules). The resulting record gets `evidenceType` (usually `photo`, `receipt` or `sms`) + `photoId` + `createdVia: 'ocr'`.

Optional on-device OCR: if you integrate `tesseract.js` (eng + hin traineddata cached by the service worker), you may run it offline, then call `extractFromText(text, {period})` from shared to build the draft locally. Show the same review screen, and save with `createdVia: 'ocr'` and `aiAssist` filled. Upload the photo itself when online. This is a nice-to-have; the server flow is the baseline.

### 5.2 Paste SMS/receipt text (`/check/[id]/paste`)
- Textarea + "Paste" button (Clipboard API where allowed).
- Offline or no consent: `extractFromText(text, {period})` locally.
- Online: `POST /ai/extract-text {text, sourceType, checkId, allowCloud}`. If the text is in a regional script and `allowCloud` is false, the local extractor may find little. Suggest "Use AI to read this message?".
- Review → confirm. Evidence type `sms` (or `receipt`), `evidenceContent` = the (redacted) pasted text.

### 5.3 Voice entry (`/check/[id]/voice`)
- Speech-to-text: Web Speech API (`window.SpeechRecognition || window.webkitSpeechRecognition`) with `lang = speechLang` of the UI language (e.g. `hi-IN`), `interimResults: true`, single utterance. Show a big pulsing mic button and the live transcript.
- If the API is missing, hide the mic and offer the typed input; it still uses the same parser.
- Parse: `parseVoiceTranscript(transcript, {period, today, entitlementKg})` locally, or `POST /ai/voice/parse {transcript, language, checkId, allowCloud}`.
- **Read-back is mandatory:** speak `draft.readBack.text` (e.g. "I heard 5 kg on 5 October, with no slip. Is that right?") with `speechSynthesis`, and show it in large text with **Yes, save** / **No, change it** buttons. "No" opens the review form pre-filled. Never save without an explicit Yes/Confirm tap.
- "I only got half this month" → `quantityExpression` with `fraction: 0.5` and a `formula` like "½ × 20 kg = 10 kg". Read back the formula.
- `intent: 'set_household'` (e.g. "we are 5 members, PHH card") → show the parsed values and, on Yes, apply them to the household form. That **un-confirms the rule**, so route the user to the rule card.
- Voice works for the household form too (members, card type): put a mic icon on those inputs.

### 5.4 Translation
- Purposes: `report` (needs `reportId`), `grievance_description` (needs `checkId`), `evidence_text` (`text`).
- `POST /ai/translate {purpose, targetLanguage, reportId|checkId|text, allowCloud: true}` → draft with `translatedText`, `backTranslation` (English) and `neutrality`.
- Review screen: original | translation (editable) | "What the translation says in English" (back-translation). Read-aloud for the translation. If `neutrality.ok` is false, highlight the flagged terms; the user must edit before confirming.
- Confirm → `POST /ai/drafts/:id/confirm {text}`. For `report` it is stored as a `ReportTranslation`, and export with `lang=<code>&format=html|txt` uses it. For `grievance_description` it replaces the description (`descriptionSource: 'translated'`). Before translating a grievance description, show the language advice (§4.7) first.

### 5.5 Text-to-speech
- Use `speechSynthesis` with the voice whose `lang` best matches `speechLang` (`hi-IN`, `ta-IN`, …). If no voice exists for the language, say so and offer the English or Hindi read-back instead.
- Queue one utterance per segment from a `ReadbackPayload`, highlight the current segment, and support pause, resume and stop.

---

## 6. Wording, labels and neutral language

### 6.1 Labels (exact meaning — use in tooltips/help)
| Label | Shown when | Explanation text (en) |
|---|---|---|
| **Shortfall** | counted total < entitlement | "The counted quantity is less than the entitlement for this month. This tool does not know why." |
| **Late** | record date outside the period | "This record's date is outside the month being checked. It is still counted." |
| **Unrecorded** | evidence type is `none` | "No slip, SMS, photo or note is linked, so it is not counted." |
| **Unclear** | user ticked "not sure", or AI-read values weren't checked | "Marked as unsure, so it is not counted until confirmed." |

Chip colours: Shortfall = amber/brown, Late = wheat/yellow, Unrecorded = grey-blue, Unclear = grey. **No red alarm colours, no warning triangles on shortfall, no skull/police/crime iconography.**

### 6.2 Possible causes (always shown with a shortfall)
From `POSSIBLE_CAUSES[lang]` (shared). English:
- Genuine stock shortage at the shop
- Biometric / e-PoS authentication failure
- Delivery split across visits that were not all recorded
- A recording or data-entry error

followed by `DISCLAIMER[lang]`: "This report states a difference and the evidence for it. It does not establish a cause and does not allege wrongdoing by any person or shop."

### 6.3 Forbidden UI vocabulary
Never use in UI copy (any language): fraud, theft, stolen, cheat, corrupt, scam, black market, diverted, suspicious, culprit, guilty, dishonest, "the dealer took", "your shop owes you". `checkNeutrality()` holds the list. Run it in a unit test over your i18n catalogs.

### 6.4 Tone
Short sentences, second person, calm. Prefer "difference" over "loss". Prefer "file a grievance" over "complain against". Avoid jargon; when you must use NFSA/FPS/DGRO, add a tap-to-explain link to the FAQ.

---

## 7. Internationalisation

- Languages (`SUPPORTED_LANGUAGES` in shared): English, Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu. Each has `speechLang` (BCP-47) and `templateSupported` (`en`, `hi` only).
- **UI strings:** your own catalogs (`apps/web/src/i18n/<code>.json`). Ship `en` and `hi` complete; the rest may start partial, falling back to English per key. Do not machine-translate UI strings at runtime.
- **Generated content** (report text, grievance description, read-back, labels' explanations, possible causes) comes from shared templates in `en`/`hi`. Other languages → user-initiated AI translation (§5.4) that the user confirms.
- Urdu is RTL: set `dir="rtl"` on `<html>` when Urdu is active, and use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-` in Tailwind).
- Fonts: Noto Sans + Noto Sans Devanagari/Bengali/Tamil/Telugu/Gujarati/Kannada/Malayalam/Gurmukhi/Oriya + Noto Nastaliq Urdu via `next/font/google`, loaded per active language.
- Numbers: show digits in Latin numerals by default (receipts and SMS use them); format kg with `formatKg()`. Dates: `Intl.DateTimeFormat(locale, {day:'numeric', month:'long', year:'numeric'})`.

---

## 8. Accessibility and low-literacy design

- Touch targets ≥ 48×48 px; primary actions full-width on mobile.
- Every screen's main instruction has a 🔊 listen button (speak the visible instruction text).
- Icons **with** text, never icon-only for primary actions.
- One primary action per screen; progressive disclosure for advanced fields.
- Large numerals for kg figures (≥ 28 px) in a tabular/monospace font.
- Colour is never the only signal: chips have text, status boxes have a text title.
- WCAG 2.1 AA contrast in light and dark themes; visible focus rings; all inputs labelled; `aria-live="polite"` for the summary figures and toasts.
- Confirmations for destructive actions (delete record/household/all data).
- Works with a phone's font scaling at 130%.

---

## 9. Privacy and consent UI

- **Never ask for an Aadhaar number** anywhere. If a pasted text or note contains one, the shared `redactSensitiveIds()` replaces it with `[ID REMOVED]`. Tell the user.
- **Ration card number:** local-only field; excluded from every API body, sync op, export JSON sent to the server, and AI call. It's available to copy on the grievance screen.
- **Cloud AI consent:** per action (or "always allow" per feature in Settings). The consent dialog lists what is sent:
  - Photo reading: the masked photo (ID numbers blacked out).
  - Paste reading: the pasted text with ID numbers removed.
  - Voice: only the transcript text (audio never leaves the phone; the browser's own speech service may process audio, so say so).
  - Translation: the report/description text (contains period, kg figures, FPS name/number; no card number).
  - Chat: your question text.
- Show "Processed on this device" vs "Processed by AI service" badges on drafts (`draft.engine`).
- Delete-everything must work offline (local wipe) and online (server wipe).

---

## 10. Visual design guidance

The reference prototype (claude.ai artifact `Xhmo3Rej81zLjyF5ttWiKh`) sets the tone: a calm "register/ledger" look, paper-like background, ink-blue text, teal accent, wheat-brown for "late", monospaced figures, a serif display font. Keep that feel:
- Light theme default with full dark mode via CSS variables (Tailwind 4 `@theme`).
- Cards with thin borders, not heavy shadows. Ledger rows separated by dashed lines.
- The arithmetic block in monospace, right-aligned numbers.
- Calm empty states with simple illustrations (grain sack, slip of paper, phone).
- No government emblems, the Ashoka Chakra, state logos, or anything resembling nfsa.gov.in's design (see §15).

---

## 11. Using `@repo/shared`

```ts
import {
  // types
  type Household, type Check, type DistributionRecord, type DiscrepancySummary, type AiDraft,
  // constants
  RULE_DEFAULTS, getRuleDefault, POSSIBLE_CAUSES, DISCLAIMER, LABEL_INFO, LOW_CONFIDENCE_THRESHOLD,
  SUPPORTED_LANGUAGES, INDIAN_STATES, FAQ, ENGINE_VERSION,
  // engine (pure, offline)
  computeEntitlement, computeSummary, assessRecords, periodBounds, isValidPeriod,
  kgToGrams, gramsToKg, formatKg, ruleFingerprint,
  // report & grievance templates (pure, offline)
  buildReportSnapshot, renderReportText, buildReadback, generateGrievanceDescription,
  // guards (pure, offline)
  checkNeutrality, redactSensitiveIds, isLikelyAadhaar,
  // offline extractors
  extractFromText, parseVoiceTranscript, matchFaq,
  // API client
  createApiClient, ApiError,
} from '@repo/shared';
```

Key signatures:
```ts
computeSummary(input: {
  household: Pick<Household, 'cardType' | 'members' | 'rule'>;
  period: string;                       // 'YYYY-MM'
  records: Array<Pick<DistributionRecord, 'id' | 'date' | 'quantityKg' | 'evidenceType' | 'evidenceContent' | 'photoId' | 'unclear' | 'aiAssist'>>;
}): DiscrepancySummary

buildReportSnapshot(input: { household; period; records; ruleConfirmedAt: string; generatedAt?: string }): ReportSnapshot
renderReportText(snapshot: ReportSnapshot, lang: 'en' | 'hi', extras?: { reportId?, version?, contentHash?, filing? }): string
generateGrievanceDescription(snapshot: ReportSnapshot, lang: 'en' | 'hi'): string
buildReadback(text: string, lang): ReadbackPayload

checkNeutrality(text: string): NeutralityResult
redactSensitiveIds(text: string): { text: string; count: number }

extractFromText(text: string, opts: { period?: string; today?: string; sourceType?: 'sms'|'receipt'|'note' }): ExtractionResult
parseVoiceTranscript(transcript: string, opts: { period?: string; today?: string; entitlementKg?: number }): VoiceParseResult & { readBack: string }

matchFaq(question: string, lang: LanguageCode): { entry: FaqEntry; score: number } | null

const api = createApiClient({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL!, getToken: () => token });
await api.households.put(id, input);   // returns Household, throws ApiError on failure
```

The API client covers every endpoint in §12 (method names are listed with each endpoint). `ApiError` has `.status`, `.code` (`ErrorCode`), `.details`.

---

## 12. API reference

Base URL: `{NEXT_PUBLIC_API_BASE_URL}` = `http://localhost:5000/api/v1`.
Auth: `Authorization: Bearer <device token>` on everything except `GET /health`, `GET /meta`, `POST /devices`, `GET /states`, `GET /entitlement-rules/defaults`, `GET /grievance-channels*`.
Content type: JSON (`application/json`) unless noted.

**Envelope** (every JSON response):
```json
{ "success": true,  "data": { ... }, "warnings": [ {"code":"NEUTRALITY_TERMS","message":"..."} ], "timestamp": "2026-10-11T10:00:00.000Z" }
{ "success": false, "error": { "code": "VALIDATION_FAILED", "message": "...", "details": [...] }, "timestamp": "..." }
```
`warnings` is optional. The API client unwraps `data` and returns warnings via `api.lastWarnings` (or use the `withWarnings` variants).

Conventions:
- IDs: UUID v4 strings generated by the client for households, checks and records (server-generated for photos, drafts, reports, filings).
- Dates `YYYY-MM-DD`, periods `YYYY-MM`, timestamps ISO-8601 UTC.
- Quantities in **kg** as numbers with ≤ 3 decimals in the API. Internally everything is integer grams.
- `PUT` = create-or-replace (idempotent). Optional `clientUpdatedAt`: if the server's copy is newer, the write is ignored and the response carries warning `STALE_WRITE_IGNORED` with the current server copy.
- Deletes are soft (tombstones, visible to `/sync/snapshot?since=`).

### 12.1 Meta & devices
| Method & path | Client method | Request | Response `data` | Notes |
|---|---|---|---|---|
| `GET /health` | `api.health()` | – | `{status, uptime, version, db: 'ok', timestamp}` | |
| `GET /meta` | `api.meta()` | – | `MetaInfo` (+ `disclaimer: {en, hi}`) | Languages, rule defaults, causes, thresholds, capabilities (`cloudAi`, `localOcr`, `pdfLanguages`). Cache it. Use `capabilities` to show or hide AI options: if `cloudAi` is false, hide "Translate" and the "use AI" toggles. |
| `GET /states` | `api.states()` | – | `IndianState[]` | Also in shared as `INDIAN_STATES`. |
| `POST /devices` | `api.devices.register()` | `{}` | `DeviceRegistration` | 201. Rate-limited. |
| `GET /devices/me` | `api.devices.me()` | – | `{deviceId, createdAt, lastSeenAt, counts: {households, checks, records, photos}}` | |
| `DELETE /devices/me` | `api.devices.deleteAll()` | – | `{deleted: true}` | Hard-deletes all data and photos for this device. Token becomes invalid. |

### 12.2 Entitlement rules
| Method & path | Client method | Response |
|---|---|---|
| `GET /entitlement-rules/defaults` | `api.rules.defaults()` | `RuleDefault[]`: PHH 5 kg per member, AAY 35 kg per family, with source title/url/note and `lastVerified`. |

### 12.3 Households
| Method & path | Client method | Request | Response | Errors |
|---|---|---|---|---|
| `GET /households` | `api.households.list()` | – | `Household[]` | |
| `GET /households/:id` | `api.households.get(id)` | – | `Household` | 404 |
| `PUT /households/:id` | `api.households.put(id, body)` | `HouseholdInput` | `Household` (201 created / 200 replaced) | 400 `VALIDATION_FAILED` |
| `DELETE /households/:id` | `api.households.delete(id)` | – | `{deleted: true}` | Cascades to its checks and records. |

Validation: `cardType` ∈ AAY/PHH/CUSTOM; `members` integer 1–30; `rule.perUnitKg` 0–100 with ≤ 3 decimals; `rule.basis` ∈ perMember/perFamily; `rule.sourceTitle` 1–200 chars; `rule.sourceNote` ≤ 1000; `rule.sourceUrl` http(s) URL or null; `rule.lastVerified` date or null; `stateCode` must exist in `INDIAN_STATES`; `district`/`fpsNo`/`fpsName` ≤ 120 chars. Text fields are redacted of Aadhaar-like numbers (warning `SENSITIVE_ID_REDACTED`).

Rule confirmation semantics: if the incoming `cardType`/`members`/`rule.perUnitKg`/`rule.basis` differ from the stored ones and `ruleConfirmed` is false → stored unconfirmed. If `ruleConfirmed` is true → `ruleConfirmedAt` = now (or kept, if nothing changed and it was already confirmed).

Example:
```json
PUT /households/6f1c…  
{ "label": "My household", "cardType": "PHH", "members": 4,
  "rule": { "perUnitKg": 5, "basis": "perMember",
            "sourceTitle": "National Food Security Act, 2013 — NFSA entitlements",
            "sourceUrl": "https://nfsa.gov.in/", "sourceNote": "National scale; state schemes may differ.",
            "lastVerified": null },
  "ruleConfirmed": true, "stateCode": "MH", "district": "Pune", "fpsNo": "0417", "fpsName": "Shop 17" }
```

### 12.4 Period checks
| Method & path | Client method | Request | Response | Errors |
|---|---|---|---|---|
| `GET /checks?householdId=` | `api.checks.list(householdId?)` | – | `Check[]` | |
| `GET /checks/:id` | `api.checks.get(id)` | – | `Check` | 404 |
| `PUT /checks/:id` | `api.checks.put(id, body)` | `CheckInput` | `Check` | 404 household, 409 `CONFLICT` if another check for the same household+period exists (`details.existingCheckId`). |
| `DELETE /checks/:id` | `api.checks.delete(id)` | – | `{deleted: true}` | |
| `GET /checks/:id/records` | `api.checks.records(id)` | – | `DistributionRecord[]` (date order) | |
| `GET /checks/:id/summary` | `api.checks.summary(id)` | – | `DiscrepancySummary` | 409 `RULE_NOT_CONFIRMED` |

### 12.5 Records
| Method & path | Client method | Request | Response | Errors |
|---|---|---|---|---|
| `GET /records/:id` | `api.records.get(id)` | – | `DistributionRecord` | 404 |
| `PUT /records/:id` | `api.records.put(id, body)` | `RecordInput` | `DistributionRecord` (+ warnings) | 400, 404 check/photo, 422 `NEUTRALITY_CHECK_FAILED` (`details.flaggedTerms`). The 422 applies only to `note`/`photo` evidence text; `sms`/`receipt` text is kept verbatim with a `NEUTRALITY_TERMS` warning. |
| `DELETE /records/:id` | `api.records.delete(id)` | – | `{deleted: true}` | |

Validation: `date` valid and not after today + 1 day; `quantityKg` 0–1000, ≤ 3 decimals; `evidenceType` enum; `evidenceContent` required (non-empty) for receipt/sms/note, ≤ 4000 chars; `photoId` required for `photo` and must belong to the device; for `none`, content/photo must be empty; `confirmed` must be `true`; max 100 records per check. Warnings: `RECORD_OUTSIDE_PERIOD`, `NO_EVIDENCE`, `SENSITIVE_ID_REDACTED`, `LOW_CONFIDENCE`.

### 12.6 Photos
| Method & path | Client method | Request | Response | Errors |
|---|---|---|---|---|
| `POST /photos` | `api.photos.upload(file, opts)` | `multipart/form-data`, field `image` (jpeg/png/webp/heic¹, ≤ 8 MB). Query: `skipQualityGate=true` (store as evidence even if blurry), `userConfirmedNoIds=true` (see below) | `Photo` (201) | 413 `PAYLOAD_TOO_LARGE`, 415 `UNSUPPORTED_MEDIA`, 422 `RETAKE_PHOTO` (`details: PhotoQuality`), 422 `MASKING_UNAVAILABLE` |
| `GET /photos/:id` | `api.photos.blob(id)` | – | `image/jpeg` bytes (masked copy) | 404 |
| `GET /photos/:id/meta` | `api.photos.meta(id)` | – | `Photo` | |
| `DELETE /photos/:id` | `api.photos.delete(id)` | – | `{deleted: true}` | 409 if a record still references it. |

¹ HEIC only if the server's image library supports it. Prefer converting to JPEG client-side (draw to a canvas → `toBlob('image/jpeg', 0.9)`), which also lets you downscale to ≤ 2000 px.

`MASKING_UNAVAILABLE`: returned when the server has no local OCR to find ID numbers. Re-send with `userConfirmedNoIds=true` after the user confirms no Aadhaar is visible. The photo is then stored with `maskingPerformed: false`.

### 12.7 AI drafts
All AI endpoints are rate-limited (30/min per device) and accept `allowCloud` (default `false`). `allowCloud: true` without server cloud capability → engine falls back to local and adds a warning. Cloud required but unavailable → `503 AI_UNAVAILABLE`.

| Method & path | Client method | Request | Response |
|---|---|---|---|
| `POST /ai/ocr` | `api.ai.ocr(body)` | `{photoId, checkId?, allowCloud?, languageHint?: LanguageCode}` | `AiDraft` (kind `ocr`) |
| `POST /ai/extract-text` | `api.ai.extractText(body)` | `{text (≤4000), sourceType: 'sms'\|'receipt'\|'note', checkId?, allowCloud?}` | `AiDraft` (kind `text_extract`) |
| `POST /ai/voice/parse` | `api.ai.voiceParse(body)` | `{transcript (≤1000), language: LanguageCode, checkId?, allowCloud?}` | `AiDraft` (kind `voice`) |
| `POST /ai/translate` | `api.ai.translate(body)` | `{purpose, targetLanguage, reportId?, checkId?, text?, allowCloud: true}` | `AiDraft` (kind `translation`) |
| `GET /ai/drafts/:id` | `api.ai.getDraft(id)` | – | `AiDraft` |
| `POST /ai/drafts/:id/confirm` | `api.ai.confirmDraft(id, body)` | `ConfirmDraftInput` | `ConfirmDraftResult` |
| `POST /ai/drafts/:id/reject` | `api.ai.rejectDraft(id)` | – | `AiDraft` (status `rejected`) |
| `POST /ai/chat` | `api.ai.chat(body)` | `{messages: ChatMessage[] (≤20, each ≤1000 chars), language, allowCloud?}` | `ChatReply` |

Confirm rules (server-enforced):
- Draft must be `pending` (else 409 `DRAFT_NOT_PENDING`).
- ocr/text_extract/voice(add_record): `record` required (it includes the client-generated `id`). The server creates the record with `createdVia` = `ocr` (ocr/text_extract) or `voice`, sets `aiAssist.draftId`, and computes `aiAssist.lowConfidenceFields`: a field the AI was unsure about is "low-confidence" unless the user changed its value. If any remain and `record.aiAssist.userVerifiedLowConfidence` is not `true`, the record is saved with `unclear: true` (response warning `LOW_CONFIDENCE`).
- ocr: the record's `photoId` defaults to the draft's photo.
- translation: `text` required; neutrality-checked (422 on failure); every number in `text` must match the source text (400 `VALIDATION_FAILED` with `details: {missing, added}` otherwise); then applied to the report translation or grievance description.
- `POST /ai/translate` with `purpose: 'report' | 'grievance_description'` and `targetLanguage` `en`/`hi` → 422 `UNSUPPORTED_LANGUAGE`, because those are generated without AI. Use `export?lang=hi` or `POST /checks/:id/grievance/regenerate {language:'hi'}` instead.
- Engines: `/ai/ocr` and `/ai/extract-text` use the cloud when `allowCloud: true`, and the on-server rule-based reader otherwise. `/ai/voice/parse` uses the rule-based parser first, and calls the cloud only when that result is weak (unknown intent, low confidence, or a language other than en/hi) and `allowCloud` is true.
- voice with `intent: 'set_household'`: no body needed; just marks it confirmed (apply the values on the client and `PUT /households/:id`).

Errors: 404, 409 `DRAFT_NOT_PENDING`, 422 `NEUTRALITY_CHECK_FAILED`, 403 `CLOUD_CONSENT_REQUIRED` (translate without `allowCloud: true`), 503 `AI_UNAVAILABLE`, 502 `AI_FAILED`, 429 `RATE_LIMITED`.

Example OCR draft:
```json
{
  "id": "d_…", "kind": "ocr", "status": "pending", "engine": "cloud", "checkId": "…", "photoId": "p_…",
  "result": {
    "docType": { "value": "receipt", "confidence": 0.9 },
    "suggestedEvidenceType": "receipt",
    "fields": {
      "date":      { "value": "2026-10-05", "confidence": 0.92, "rawText": "05/10/2026" },
      "quantityKg":{ "value": 5,            "confidence": 0.88, "rawText": "Rice 3.000 Kg / Wheat 2.000 Kg" },
      "reference": { "value": "88213",      "confidence": 0.6,  "rawText": "Txn No 88213" },
      "commodity": { "value": "mixed",      "confidence": 0.8,  "rawText": null }
    },
    "lineItems": [ {"commodity":"rice","quantityKg":3,"confidence":0.9,"rawText":"Rice 3.000 Kg"},
                   {"commodity":"wheat","quantityKg":2,"confidence":0.86,"rawText":"Wheat 2.000 Kg"} ],
    "quantityFormula": "3 kg (rice) + 2 kg (wheat) = 5 kg",
    "extractedText": "… [ID REMOVED] …",
    "legibility": "good", "retakeSuggested": false, "retakeReasons": [],
    "sensitiveIdsRedacted": 1, "lowConfidenceFields": ["reference"]
  },
  "readBack": { "language": "en", "text": "I read 5 kg on 5 October 2026, slip number 88213. Please check the slip number." },
  "warnings": [ { "code": "LOW_CONFIDENCE", "message": "Please check: reference" } ],
  "createdAt": "…", "resolvedAt": null
}
```

### 12.8 Reports
| Method & path | Client method | Request | Response | Errors |
|---|---|---|---|---|
| `POST /checks/:id/reports` | `api.reports.create(checkId, body)` | `{language?: 'en'\|'hi'}` | `Report` (201) | 409 `RULE_NOT_CONFIRMED`, 422 `NEUTRALITY_CHECK_FAILED` (an evidence note contains accusatory terms; `details.records[]` lists `{recordId, flaggedTerms}`) |
| `GET /checks/:id/reports` | `api.reports.list(checkId)` | – | `Array<Pick<Report,'id'\|'version'\|'language'\|'createdAt'\|'contentHash'>>` | |
| `GET /reports/:id` | `api.reports.get(id)` | – | `Report` | |
| `GET /reports/:id/export?format=txt\|html\|pdf\|json&lang=` | `api.reports.export(id, format, lang)` → `Blob` | – | file (`Content-Disposition: attachment`) | 422 `UNSUPPORTED_LANGUAGE` if `lang` is neither the template language nor a confirmed translation, or PDF in a language other than `en`/`hi` |
| `GET /reports/:id/readback?lang=` | `api.reports.readback(id, lang)` | – | `ReadbackPayload` | |

Creating a report sets the check status to `reported` (unless already `filed`).

### 12.9 Grievance & filing
| Method & path | Client method | Request | Response | Errors |
|---|---|---|---|---|
| `GET /checks/:id/grievance` | `api.grievance.get(checkId)` | – | `GrievanceDraft` (auto-created from household + latest report) | 409 `RULE_NOT_CONFIRMED` |
| `PUT /checks/:id/grievance` | `api.grievance.put(checkId, body)` | `GrievanceDraftInput` | `GrievanceDraft` | 422 `NEUTRALITY_CHECK_FAILED` |
| `POST /checks/:id/grievance/regenerate` | `api.grievance.regenerate(checkId, body)` | `{language?: 'en'\|'hi'}` | `GrievanceDraft` (description regenerated from the latest report) | |
| `GET /checks/:id/grievance/readback` | `api.grievance.readback(checkId)` | – | `ReadbackPayload` of the current description | |
| `GET /checks/:id/filing` | `api.filing.get(checkId)` | – | `Filing \| null` | |
| `PUT /checks/:id/filing` | `api.filing.put(checkId, body)` | `FilingInput` | `Filing` | 400 |
| `DELETE /checks/:id/filing` | `api.filing.delete(checkId)` | – | `{deleted: true}` | |

`FilingInput` validation: `referenceNumber` 3–64 chars (`[A-Za-z0-9/_-]` and spaces), `filedDate` not in the future, `portalUrl` http(s) or null. Saving a filing sets check status `filed`; deleting reverts it to `reported` (or `open`).

### 12.10 Grievance channel directory
| Method & path | Client method | Request | Response |
|---|---|---|---|
| `GET /grievance-channels?stateCode=XX` | `api.channels.list(stateCode?)` | – | `GrievanceChannel[]` (national + that state's) |
| `GET /grievance-channels/:id` | `api.channels.get(id)` | – | `GrievanceChannel` |
| `PUT /grievance-channels/:id` | (admin) | `GrievanceChannelInput`, header `X-Admin-Token` | `GrievanceChannel` |
| `DELETE /grievance-channels/:id` | (admin) | header `X-Admin-Token` | `{deleted: true}` |

The admin endpoints exist for maintaining the directory; the end-user app does not need an admin UI.

### 12.11 Sync
| Method & path | Client method | Request | Response |
|---|---|---|---|
| `GET /sync/snapshot?since=ISO` | `api.sync.snapshot(since?)` | – | `SyncSnapshot` |
| `POST /sync/batch` | `api.sync.batch(ops)` | `{operations: SyncOperation[]}` (≤ 200) | `{results: SyncOperationResult[], serverTime}` |

Each op is applied with the same validation as the single-entity endpoint. Failures are per-op (`status: 'error'`) and don't abort the batch.

### 12.12 Utilities
| Method & path | Client method | Request | Response |
|---|---|---|---|
| `POST /utils/neutrality-check` | `api.utils.neutrality(text)` | `{text}` | `NeutralityResult` (same as shared `checkNeutrality`) |
| `POST /utils/redact` | `api.utils.redact(text)` | `{text}` | `{text, count}` |

### 12.13 Warnings (non-blocking, in `response.warnings`)
| Code | Where | UI behaviour |
|---|---|---|
| `NEUTRALITY_TERMS` | records (sms/receipt), translation drafts | Show the flagged words. On a translation draft, Confirm must stay disabled until they're edited out. |
| `SENSITIVE_ID_REDACTED` | any text input, OCR | "We removed {n} number(s) that looked like an Aadhaar number." |
| `LOW_CONFIDENCE` | drafts, records | Highlight the fields; explain the record will be Unclear unless checked. |
| `RETAKE_SUGGESTED` | OCR drafts | Offer Retake first, then manual entry. |
| `RECORD_OUTSIDE_PERIOD` | records | Inline hint "will be marked Late (still counted)". |
| `NO_EVIDENCE` | records | Inline hint "will be marked Unrecorded (not counted)". |
| `LANGUAGE_ACCEPTANCE_UNKNOWN` | grievance | Show the language-advice box prominently. |
| `STALE_WRITE_IGNORED` | PUTs | Replace the local copy with the returned entity and show a toast. |
| `NUMBERS_CHANGED` | translation drafts | Highlight the numbers that differ (`details.missing`/`added`); Confirm stays disabled until they match. |
| `CLOUD_UNAVAILABLE_LOCAL_USED` | AI endpoints | Small note: "Read on this device/server (AI service unavailable)". |

---

## 13. Error codes → UI behaviour

| Code | HTTP | UI behaviour |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Map `details[]` (`{path, message}`) onto form fields. |
| `UNAUTHORIZED` | 401 | Re-register the device silently and replay via sync. |
| `FORBIDDEN` | 403 | Generic "not allowed" toast. |
| `CLOUD_CONSENT_REQUIRED` | 403 | Show the consent dialog, then retry with `allowCloud: true`. |
| `NOT_FOUND` | 404 | If local data exists, push it via sync; else "This item no longer exists". |
| `CONFLICT` | 409 | Check-period duplicate → navigate to `details.existingCheckId`. |
| `RULE_NOT_CONFIRMED` | 409 | Route to the rule card with the banner. |
| `DRAFT_NOT_PENDING` | 409 | Refresh the draft and leave the review screen. |
| `NEUTRALITY_CHECK_FAILED` | 422 | Highlight `details.flaggedTerms` in the text field. Copy: "Please describe what was received, without saying who caused it. The report must stay neutral." |
| `SENSITIVE_ID_DETECTED` | 422 | "Please remove the Aadhaar number from this text." |
| `RETAKE_PHOTO` | 422 | Retake screen with per-issue tips (§5.1). |
| `MASKING_UNAVAILABLE` | 422 | "Make sure no Aadhaar number is visible" confirm → re-upload with `userConfirmedNoIds=true`. |
| `UNSUPPORTED_LANGUAGE` | 422 | Offer HTML export or a translation. |
| `UNSUPPORTED_MEDIA` / `PAYLOAD_TOO_LARGE` | 415/413 | Convert/downscale client-side and retry once. |
| `RATE_LIMITED` | 429 | "Please wait a moment" + retry after `Retry-After`. |
| `AI_UNAVAILABLE` / `AI_FAILED` | 503/502 | Fall back to the local extractor / manual entry; never block record entry. |
| `INTERNAL` | 500 | Generic error; local data is safe. |

Network failures: never lose user input. Writes go to the outbox first.

---

## 14. Acceptance checklist

Walk through these before calling the frontend done.

**Rule (P1)**
- [ ] Choosing PHH with 4 members shows `5 kg × 4 members = 20 kg`, the source link and "not verified" (when `lastVerified` is null); no summary until **Use this rule** is tapped.
- [ ] Changing members after confirming un-confirms the rule and hides the summary until re-confirmed.
- [ ] AAY shows `35 kg per family = 35 kg` regardless of members.

**Ledger & arithmetic (P2, P3, P5)**
- [ ] Records 12 kg (sms), 4 kg (note), 3 kg (none) for a 20 kg entitlement show counted 16 kg, difference 4 kg, Shortfall; the 3 kg record shows Unrecorded and "not counted".
- [ ] A record dated in the next month shows Late and is still counted.
- [ ] An "unsure" record shows Unclear and is not counted.
- [ ] The summary values equal `GET /checks/:id/summary` for the same data.
- [ ] Everything above works in airplane mode, and syncs once the network is back.

**AI drafts (P4)**
- [ ] OCR, paste, voice and translation all stop at a review screen; nothing is saved without Confirm.
- [ ] A low-confidence field left unchecked results in an Unclear record.
- [ ] Voice always reads back and needs "Yes, save".
- [ ] A blurry photo leads to a retake screen, not a guessed value.

**Neutrality (P5, P6)**
- [ ] A note "dealer stole 5 kg" shows a live hint, and the server's rejection is shown on the field.
- [ ] Every shortfall view shows the possible causes and the disclaimer.
- [ ] i18n catalogs pass `checkNeutrality()` in a unit test.

**Grievance (P7)**
- [ ] Copy buttons work for every field; the ration card number comes from local storage only.
- [ ] The portal button is disabled until the read-back is played or "I read it myself" is ticked; it opens a new tab to the real portal; no iframe anywhere.
- [ ] Saving a reference number shows the Filed stamp and it appears on the exported report.

**Privacy**
- [ ] No API request body ever contains `rationCardNo` (verify in DevTools).
- [ ] Cloud AI calls happen only after consent.
- [ ] "Delete everything" wipes IndexedDB and calls `DELETE /devices/me`.

**A11y / i18n**
- [ ] Hindi UI is complete; Urdu renders RTL; Tamil/Bengali glyphs render with Noto fonts.
- [ ] All primary actions are reachable by keyboard and have visible focus.

---

## 15. Explicitly forbidden

- Any screen that looks like nfsa.gov.in or a state portal's login, OTP or grievance form, even labelled "demo".
- `<iframe>`/webview of a government site; auto-filling a government site; browser extensions/bookmarklets for it.
- Asking for an Aadhaar number, OTP, or password.
- Any "who is responsible", "likely cause", "shop rating", leaderboard, heat-map, or cross-household/cross-shop comparison.
- Any farm → warehouse → shop tracking visuals or claims.
- Auto-saving AI output; showing AI-computed totals.
- Words listed in §6.3 in any UI string.
