# Dhokla Dominators - Vortexa Monorepo

A production-ready full-stack monorepo built with **pnpm workspaces**, featuring **Next.js 16 (App Router)** for the frontend, **Express + TypeScript** for the backend API, and a shared **TypeScript library** for end-to-end type safety.

---

## 🏗️ Repository Architecture

```
.
├── apps/
│   ├── web/                     # Next.js 16 (App Router + React 19 + Tailwind CSS)
│   │   ├── src/
│   │   │   └── app/             # App router pages & components
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── api/                     # Node.js Express + TypeScript backend
│       ├── src/
│       │   ├── routes/          # Modular API routes (/health, /users, etc.)
│       │   └── index.ts         # Server entrypoint
│       ├── .env.example
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                  # Common TypeScript types, interfaces & utils
│       ├── src/
│       │   └── index.ts         # Shared ApiResponse, User, HealthStatus, APP_CONFIG
│       ├── tsconfig.json
│       └── package.json
│
├── pnpm-workspace.yaml          # pnpm workspace definition
├── package.json                 # Monorepo root scripts & dev dependencies
└── .gitignore                   # Multi-package ignore rules
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: `v20+` (Tested on `v22.22.2`)
- **pnpm**: `v9+` / `v12+` (Run `npm install -g pnpm` if not installed)

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Run Development Servers
Start both the Frontend and Backend concurrently with one command:
```bash
pnpm dev
```
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 🛠️ Workspace Commands

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Start both frontend & backend concurrently |
| `pnpm dev:web` | Start only the Next.js frontend on port 3000 |
| `pnpm dev:api` | Start only the Express API on port 5000 (hot reload with `tsx`) |
| `pnpm build` | Build all packages (`@repo/shared`, `@repo/api`, `@repo/web`) |
| `pnpm build:shared` | Compile the shared package TypeScript definitions |
| `pnpm build:api` | Build the Express API to `apps/api/dist` |
| `pnpm build:web` | Build the Next.js production bundle |
| `pnpm clean` | Remove `node_modules`, `dist`, and `.next` build caches |

---

## 📦 Shared Library (`@repo/shared`)

Both `apps/web` and `apps/api` import directly from `@repo/shared`:

```typescript
import { APP_CONFIG, ApiResponse, HealthStatus, User } from '@repo/shared';
```

Any data models, validations, constants, or types defined in `packages/shared` are automatically synchronized and typed across the entire stack.

---

## 🚀 Environment Configuration

For backend environment variables, copy `.env.example` in `apps/api`:
```bash
cp apps/api/.env.example apps/api/.env
```

Default variables:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```
