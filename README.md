# RationSaathi

**A public distribution entitlement & dispute assistant** (Domain 6 · Public Systems & Civic Technology · P-01).

RationSaathi helps a ration-card holder compare what they are entitled to under India's National Food Security Act with what they actually received, with every figure tied to evidence. It produces a strictly neutral report and prepares a grievance that **they file themselves** on the official portal. It never decides why a difference exists, never accuses anyone, and never submits anything on the user's behalf.

| Document | For |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Idea analysis, architecture, how each core principle is enforced, work plan, open items |
| [docs/FRONTEND_SPEC.md](docs/FRONTEND_SPEC.md) | Frontend build spec: screens, flows, rules, full API reference |
| [apps/api/README.md](apps/api/README.md) | Backend details: environment, privacy & AI data flows |

---

## Running the project

### 1. Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| [Node.js](https://nodejs.org/) | **22.13 or newer** | Everything. The API uses Node's built-in SQLite. |
| [pnpm](https://pnpm.io/) | 12.x | Installing and running the monorepo. Enable it with `corepack enable` or install with `npm i -g pnpm`. |
| [Tesseract OCR](https://tesseract-ocr.github.io/tessdoc/Installation.html) | 5.x | *Optional.* Reads receipt photos and blacks out Aadhaar numbers **on your own machine**. |
| `curl` | any | *Optional.* Used by the asset-download script. |

Install Tesseract (optional):

```bash
# Ubuntu / Debian
sudo apt install tesseract-ocr
# Arch
sudo pacman -S tesseract
# macOS
brew install tesseract
```

Without Tesseract the app still works: photo uploads ask the user to confirm no Aadhaar number is visible, and receipt reading falls back to manual entry (or to Claude, if configured).

### 2. Get the code and install

```bash
git clone https://github.com/ayush-shirode/Dhokla_Dominators_Vortexa.git
cd Dhokla_Dominators_Vortexa
pnpm install
```

### 3. Download OCR models and PDF fonts (one-time)

```bash
pnpm setup:assets
```

This puts Tesseract's English and Hindi models in `apps/api/tessdata/`, and Noto Sans and Noto Sans Devanagari in `apps/api/assets/fonts/`. The fonts are what make English and Hindi PDF export work. Both folders are gitignored.

### 4. Create the environment files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

The defaults work for local development: API on port 5000, web on port 3000. Settings you may want to change in `apps/api/.env`:

| Variable | What it does |
|---|---|
| `ANTHROPIC_API_KEY` | Turns on the optional cloud AI features: AI photo reading, translation and AI chat answers. Leave it empty to run fully local and rule-based. |
| `ADMIN_TOKEN` | Lets you edit the grievance-channel directory through the API. Set it to a long random string. |
| `FRONTEND_URL` | The browser origins allowed to call the API (comma-separated). |

The full list is in [apps/api/README.md](apps/api/README.md#environment).

### 5. Start both apps

```bash
pnpm dev
```

This builds the shared package, then starts:

- **Web app:** http://localhost:3000 (open it on your phone through your computer's LAN IP; see the troubleshooting tips below)
- **API:** http://localhost:5000/api/v1. Check http://localhost:5000/api/v1/meta to see which features are on (`cloudAi`, `localOcr`, `pdfLanguages`).

To run them separately: `pnpm dev:api` and `pnpm dev:web`. Run `pnpm build:shared` first after changing anything in `packages/shared`.

### 6. Try it

1. Open http://localhost:3000. Pick a language and finish onboarding, or tap **Try with example data**.
2. **Household & rule:** choose PHH or AAY, set the members, then tap **Use this rule**. Nothing is calculated until you do.
3. **Check a month → Add record:** type it, paste an SMS, say it, or photograph a slip.
4. **Make report → Save Report:** this creates the official version with a SHA-256 hash, and the PDF download becomes available.
5. **Grievance helper:** listen to the description, copy the fields, and open the official portal in a new tab. Then save the reference number you get.

### 7. Tests and checks

```bash
pnpm test        # 37 backend + engine tests, plus the UI catalog check (all 13 languages complete and neutral)
pnpm typecheck   # shared + API + web
```

### Ration card types by state

The household form asks for the state first and then offers that state's own card names. AAY and PHH pre-fill the sourced national figure, and every other card starts with no figure: the household types the quantity and says where it comes from.

The data lives in `ration_data/india_ration_entitlements.csv` (from the research prompt in [docs/RESEARCH_PROMPT.md](docs/RESEARCH_PROMPT.md)). After editing it, rebuild the catalog the apps read:

```bash
pnpm build:card-catalog     # ration_data/*.csv → packages/shared/src/cardCatalog.generated.ts
pnpm build:shared
```

### Offline use and installing on a phone

The service worker only runs in a **production build**, so test offline behaviour with `pnpm build && pnpm start`, not `pnpm dev`.

- Open the app once while online. It then saves its pages so it can open with no network, and every month's ledger works offline, including months created offline.
- Records and photos added offline are saved on the phone. Records back up automatically when the connection returns. Photos show **Waiting to be read**; tap **Read now** once you're online.
- To install it: in Chrome, use **Add to Home screen**. Browsers only allow installing over `https://` or on `localhost`.
- To test offline in Chrome: DevTools → Network → **Offline**.

Cloud AI features (AI photo reading, translation into languages other than English and Hindi, AI chat answers) need `ANTHROPIC_API_KEY` on the server. The app asks the user's permission before each use, unless they chose "Always allow" in Settings.

### 8. Production build

```bash
pnpm build       # shared → API (apps/api/dist) → web (.next)
pnpm start       # runs the built API and web together
```

For a real deployment, put the API behind HTTPS and set `FRONTEND_URL` to the deployed web origin. Set `NEXT_PUBLIC_API_BASE_URL` (in `apps/web/.env.local` **before** `pnpm build`) to the public API URL. Back up `apps/api/data/`, which holds the SQLite database and the masked evidence photos.

### Troubleshooting

| Problem | Fix |
|---|---|
| `node:sqlite` error / `ERR_UNKNOWN_BUILTIN_MODULE` | Upgrade Node to 22.13 or newer (`node --version`). |
| `Port 5000/3000 already in use` | Stop the other process, or change `PORT` in `apps/api/.env` and the port in `NEXT_PUBLIC_API_BASE_URL`. |
| Web can't reach the API / CORS error | Make sure `FRONTEND_URL` in `apps/api/.env` matches the address in your browser, e.g. `http://192.168.1.20:3000` when testing from a phone. |
| `/meta` shows `localOcr: false` | Install Tesseract and run `pnpm setup:assets`. |
| PDF export returns `UNSUPPORTED_LANGUAGE` | Run `pnpm setup:assets` to download the fonts. Languages other than English and Hindi export as HTML; print it to PDF from the browser. |
| Changes in `packages/shared` don't show up | Run `pnpm build:shared` (`pnpm dev` does this on start). |
| `git pull` hangs on `ssh: connect to host github.com port 22` | Your network blocks SSH. Use HTTPS (`git remote set-url origin https://github.com/ayush-shirode/Dhokla_Dominators_Vortexa.git`), or SSH over port 443. |
| Microphone / camera don't work on a phone | Browsers only allow them on `https://` or `localhost`. Use an HTTPS tunnel, or test on the computer itself. |

---

## Stack

pnpm monorepo:

```
apps/web         Next.js 16 + React 19 + Tailwind 4 — offline-first PWA (IndexedDB + sync outbox)
apps/api         Express + TypeScript + SQLite (node:sqlite) — REST API on :5000
packages/shared  @repo/shared — types, deterministic entitlement engine, neutral report/grievance
                 templates (EN/HI), neutrality guard, Aadhaar redaction, offline extractors, FAQ,
                 typed API client. Runs identically in the browser (offline) and on the server.
```

Why this stack:
- **One TypeScript contract** across client and server, and the arithmetic engine runs offline in the browser (Spec §5.7).
- **Local Tesseract OCR** masks Aadhaar numbers without any third-party call.
- **Claude (`claude-opus-5-5`)** is used for opt-in AI reading, translation and help, and always returns drafts for the user to confirm.

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
