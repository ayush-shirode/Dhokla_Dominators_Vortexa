# RationSaathi — Analysis & Project Plan

Domain 6 · Public Systems & Civic Technology · P-01
*A public distribution entitlement & dispute assistant.*

Companion documents: [FRONTEND_SPEC.md](FRONTEND_SPEC.md) (UI build spec and full API reference) · [../apps/api/README.md](../apps/api/README.md) (backend setup, AI data flows).

---

## 1. The idea in one paragraph

A ration-card holder under India's National Food Security Act (NFSA) is entitled to a fixed quantity of foodgrains each month: 5 kg per person (Priority Household, PHH) or 35 kg per family (Antyodaya, AAY). When they receive less, they rarely have an organised, checkable record, and filing a grievance means typing a free-text complaint into a government portal. RationSaathi turns "I think I got less" into a **neutral, evidence-backed statement of a difference**. It records the rule, every collection with its slip/SMS/photo/note, the plain arithmetic, and a list of possible causes the tool does *not* choose between. It then prepares the grievance fields so the beneficiary can file it **themselves** on the real portal.

## 2. Analysis

### 2.1 Users and context
| User | Needs | Constraints |
|---|---|---|
| Ration beneficiary (primary) | Know what they're owed; prove what they got; complain without being turned away | Low literacy for some; regional languages; cheap Android phone; patchy network; fear of confrontation with the shop |
| Helper (family member, NGO volunteer, CSC operator) | Fill this in on someone's behalf quickly | Shared device; needs clear, printable output |
| Grievance officer (indirect) | A clear, factual complaint they can act on | Will dismiss accusatory or vague complaints |

### 2.2 What makes the idea strong
- **Narrow and checkable.** Comparing entitlement with receipts is arithmetic, not judgement. Anyone can re-check it, which makes the output credible to officials.
- **Neutral by design.** The tool never accuses anyone. That protects the user (no defamation risk, no confrontation) and makes the complaint easier to accept.
- **Works with the real system.** It prepares input for the existing NFSA/state grievance process instead of building a parallel one, so there are no integrations to negotiate.
- **AI only where it removes friction.** AI reads slips, transcribes speech and translates. It never decides numbers or causes.

### 2.3 Risks and how the design answers them
| Risk | Why it matters | Mitigation (implemented) |
|---|---|---|
| Wrong entitlement rule | Every downstream number would be wrong | Rule pre-filled from NFSA but must be **explicitly confirmed**. Any edit un-confirms it. The formula is always shown. The server refuses summaries and reports until it is confirmed (`RULE_NOT_CONFIRMED`). |
| AI misreads a slip | A false shortfall or a hidden one | AI output is always a **draft**. Low-confidence fields must be checked, or the record becomes *Unclear* and is not counted. Totals from line items are summed in code. Blurry photos are rejected before reading. |
| Accusatory language | Legal exposure for the user; officials dismiss the complaint | Deterministic templates; a multi-script **neutrality guard** on templates (unit-tested), notes, edited descriptions, AI translations and chatbot replies; a static list of benign possible causes on every report. |
| Aadhaar exposure | Serious privacy harm | Never asked for. Text is redacted with checksum-validated detection. Photos are OCR-scanned **on the server** and Aadhaar/VID regions are blacked out before storage or any cloud call. The original is never written to disk. |
| Ration card number leakage | Personal identifier | Kept **only on the device**. The API has no field for it. |
| Imitating government portals | Phishing-like harm and loss of trust | No iframe, mirror or look-alike. The portal opens in a new tab and the user completes OTP there. |
| No connectivity | The core use happens at or near the shop | Offline-first PWA. The deterministic engine, templates, extractors and FAQ ship in `@repo/shared` and run in the browser. A sync queue uses idempotent PUTs. |
| Low literacy | Can't read the report they file | Voice entry with mandatory read-back, TTS of the report and description, icon+text UI, and a required "listen before filing" step. |
| Unverified directory data | Wrong helpline means a dead end | Every channel carries a source, a `lastVerified` date and a verification status. All seeds are marked **unverified**, and an admin API exists to maintain them. |
| Claiming upstream visibility | No public lot-level data exists | No supply-chain features at all (Principle 8). |

### 2.4 Scope decisions
In scope: §4.1–§4.4 core flow, §5.1–§5.7 AI features (as drafts), offline-first, privacy controls.
Out of scope (deliberately): auto-submission, portal scraping, supply-chain tracing, cause inference, shop rankings, cross-household analytics.

## 3. Architecture

```
apps/web  (Next.js 16 PWA)  ──HTTPS──►  apps/api (Express + SQLite)
   │  IndexedDB = source of truth on device        │  device-token auth, per-device data
   │  sync outbox → POST /sync/batch               │  photos: quality gate → local OCR → Aadhaar mask → store masked JPEG
   │                                               │  AI drafts (Claude, opt-in per call) + rule-based local engines
   └── @repo/shared  ◄──── same code ────────────► │  reports: immutable snapshots + SHA-256, PDF/HTML/TXT export
        engine · templates · guards · extractors · FAQ · typed API client
```

**Stack choices (and why)**
| Concern | Choice | Reason |
|---|---|---|
| Monorepo | pnpm workspaces (existing scaffold) | One type contract shared by frontend and backend |
| Frontend | Next.js 16 + React 19 + Tailwind 4, PWA | Existing scaffold; installable; offline service worker |
| Backend | Express 4 + TypeScript (existing scaffold) | Simple and familiar to the team |
| DB | SQLite via Node's built-in `node:sqlite` | No native build step; single file; enough for a pilot |
| Validation | zod 4 | Precise 400 errors with field paths |
| Images | sharp | Fast normalise, quality metrics, masking, EXIF stripping |
| Local OCR | tesseract 5 (eng + hin), on the server | Finds Aadhaar numbers **without any third-party call**, and is the offline reader |
| Cloud AI | Claude (`claude-opus-5-5`) via the Anthropic SDK, structured JSON outputs | Strong multilingual reading/translation; schema-constrained output; server-side refusal fallback enabled |
| PDF | pdfkit + Noto Sans / Noto Sans Devanagari | Correct Hindi shaping (verified visually) |
| Tests | vitest + supertest | 37 tests over the engine, principles and full API flows |

## 4. How each core principle is enforced

| # | Principle | Mechanism | Where | Tested |
|---|---|---|---|---|
| 1 | Rule explicit & confirmed | `ruleConfirmed` + fingerprint; any change without re-confirming clears it; 409 on summary, report and grievance until confirmed | `repo/households.ts`, `repo/checks.ts` | ✓ |
| 2 | Arithmetic never AI | Integer-gram engine in shared; AI line items summed in code; spoken fractions applied in code; translations must preserve every number | `shared/engine.ts`, `services/ai/tasks.ts` | ✓ |
| 3 | Evidence-linked | Evidence type + content/photo required by type; `none` → Unrecorded, not counted; evidence quoted in every report | `repo/checks.ts`, `shared/report.ts` | ✓ |
| 4 | AI output is a draft | Drafts table; records from AI only via `/ai/drafts/:id/confirm`; low-confidence fields not changed or verified → Unclear | `routes/ai.ts` | ✓ |
| 5 | Labels describe data | Labels computed only from dates, quantities and evidence presence | `shared/engine.ts` | ✓ |
| 6 | Neutral language | Templates + neutrality guard (EN + Hinglish + 10 scripts) on notes, descriptions, translations, chat; static causes + disclaimer | `shared/guards.ts`, `shared/report.ts` | ✓ |
| 7 | No auto-submission | No portal integration at all; grievance = copy fields + link; filing ref entered by the user | `services/grievance.ts` | ✓ |
| 8 | No supply-chain tracing | Not built; spec forbids such UI | — | n/a |

## 5. Data model (as built)

`devices` → `households` (card, members, rule JSON, rule confirmation, state/district/FPS; **no ration card no.**) → `checks` (household + period `YYYY-MM`, unique) → `records` (date, grams, commodity, evidence type/content/photo, unclear, createdVia, aiAssist).
Also: `photos` (masked only), `drafts` (AI output awaiting confirmation), `reports` (immutable snapshot + SHA-256 + text) → `report_translations` (user-confirmed only), `grievance_drafts`, `filings` (reference number the user got from the portal), `channels` (sourced, dated, verification status).
Soft-deletes on households/checks/records give tombstones for sync. `DELETE /devices/me` hard-deletes everything, including photo files.

## 6. AI features — design summary

| Feature | Local (no third party) | Cloud (only with `allowCloud: true`) | Output |
|---|---|---|---|
| OCR of slips/SMS/notes | tesseract + rule-based extractor | Claude vision on the **masked** image | Draft; quantity = code sum of line items |
| Blur/lighting detection | sharp metrics (Laplacian variance, brightness, contrast) | — | 422 `RETAKE_PHOTO` |
| Aadhaar masking | tesseract word boxes + Verhoeff check → black boxes | — | Masked JPEG only is stored |
| Document-type detection | keyword heuristics + OCR confidence | Claude classification | Overridable suggestion |
| Pasted text | regex extractor (EN/HI, Indic digits) | Claude (regional scripts) | Draft |
| Voice → form | Web Speech API in browser; rule-based parser (EN/Hinglish/HI numbers, "half") | Claude when local is weak | Draft + read-back sentence |
| Translation | EN/HI templates (no AI) | Claude + back-translation + number check + neutrality check | Draft → confirmed translation |
| Read-back (TTS) | Browser `speechSynthesis`; server gives sentence segments | — | — |
| Explainer chatbot | FAQ (EN/HI) + cause-question guardrail | Claude, scoped, post-checked for neutrality | Q&A only |

## 7. Work plan

### Done (backend + shared core)
- [x] Shared engine, templates (EN/HI), guards, extractors, FAQ, typed API client
- [x] API: devices, households, checks, records, summary, photos, AI drafts, reports and exports, grievance, filing, channel directory, sync
- [x] Local OCR + Aadhaar masking (verified visually); Hindi PDF (verified visually)
- [x] 37 automated tests; production build boots

### Frontend (other agent) — suggested order
1. App shell, i18n (EN/HI), device registration, IndexedDB store + outbox sync
2. Household & rule card (P1) → period ledger with live `computeSummary()` (P2/P3/P5)
3. Record form (manual) → report preview/save/export → grievance helper + read-back + filing
4. Paste-text and voice drafts (offline parsers first) → photo capture + OCR review
5. Chatbot, channel directory, settings (consent toggles, delete all), PWA offline polish
6. Run the acceptance checklist in FRONTEND_SPEC §14

### Integration & demo prep
- Set `ANTHROPIC_API_KEY` to enable cloud features; otherwise everything runs local and rule-based.
- Demo script (5 min):
  1. Choose PHH, 4 members, then confirm the rule (show it can't be skipped).
  2. Add a record by pasting an SMS, then add one by voice ("on the 5th I only got half"). Show the read-back and the Unclear outcome when it isn't verified.
  3. Photograph a slip with a (sample) Aadhaar number and show the black box.
  4. Show the summary arithmetic, the possible causes and the disclaimer.
  5. Save the report and download the Hindi PDF.
  6. Open the grievance helper, play the read-back, copy the fields and open the real portal in a new tab. Then enter a sample reference and show the Filed stamp.
  7. Ask the chatbot "why did I get less?" and show the neutral redirect.

## 8. Open items (must be resolved before real-world use)
1. **Verify the NFSA scale and source URL** against nfsa.gov.in. Then set `RULE_DEFAULTS_LAST_VERIFIED`. The site could not be fetched during the build.
2. **Verify and extend the channel directory** (grievance page path, status-check page, state helplines, DGRO contacts, accepted languages) through the admin API. All seeds are currently `unverified`.
3. **Native-speaker review of the Hindi templates** and FAQ.
4. **Legal review** of the report and grievance wording, and of the privacy notes. This tool is not legal advice.
5. Aadhaar masking is **best-effort**. It depends on OCR reading the number, so it is weaker on handwriting, skewed photos and stylised fonts. The UI tells users to cover IDs anyway.
6. Tune the photo-quality thresholds (env vars) on real phone photos of e-PoS slips.
7. Pilot hosting: SQLite + local disk suits a pilot. For scale, move to Postgres + object storage, put the API behind TLS, and add backups.

## 9. Not planned (out of scope by design)
Auto-filing; portal automation; supply-chain/stock visibility; cause inference; shop or official ratings; cross-household analytics. A future *aggregate* module would need fresh research and its own privacy review.
