# RationSaathi

**A public distribution entitlement & dispute assistant** (Domain 6 · Public Systems & Civic Technology · P-01).

RationSaathi helps a ration-card holder compare what they are entitled to under India's National Food Security Act with what they actually received, with every figure tied to evidence. It produces a strictly neutral report and prepares a grievance that **they file themselves** on the official portal. It never decides why a difference exists, never accuses anyone, and never submits anything on the user's behalf.

| Document | For |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Idea analysis, architecture, how each core principle is enforced, work plan, open items |
| [docs/FRONTEND_SPEC.md](docs/FRONTEND_SPEC.md) | Frontend build spec: screens, flows, rules, full API reference |
| [apps/api/README.md](apps/api/README.md) | Backend setup, environment, privacy & AI data flows |

## Stack

pnpm monorepo:

```
apps/web         Next.js 16 + React 19 + Tailwind 4 — offline-first PWA (mobile-first)
apps/api         Express + TypeScript + SQLite (node:sqlite) — REST API on :5000
packages/shared  @repo/shared — types, deterministic entitlement engine, neutral report/grievance
                 templates (EN/HI), neutrality guard, Aadhaar redaction, offline extractors, FAQ,
                 typed API client. Runs identically in the browser (offline) and on the server.
```

Why this stack: one TypeScript contract across client and server, and the arithmetic engine runs offline in the browser (Spec §5.7). Local tesseract OCR masks Aadhaar numbers without any third-party call. Claude (`claude-opus-5-5`) is used for opt-in AI reading, translation and help, always returning drafts.

## Quick start

```bash
pnpm install
pnpm setup:assets                       # OCR models (eng+hin) + PDF fonts; needs `tesseract` for OCR
cp apps/api/.env.example apps/api/.env  # add ANTHROPIC_API_KEY to enable cloud AI (optional)
pnpm build:shared
pnpm dev                                # API http://localhost:5000/api/v1 · Web http://localhost:3000
pnpm test                               # backend + engine tests
```

Node ≥ 22.13 is required.

## Core principles (enforced in code)
1. The entitlement rule is explicit and user-confirmed.
2. Arithmetic never depends on AI.
3. Every record is evidence-linked.
4. AI output is always a draft that the user confirms.
5. Labels (Shortfall / Late / Unrecorded / Unclear) describe data, not causes.
6. Report language is strictly neutral.
7. No automatic submission to government systems.
8. No farm-to-shop supply-chain tracing.

*Not legal advice. The grievance-channel directory is unverified and must be reviewed before production use.*
