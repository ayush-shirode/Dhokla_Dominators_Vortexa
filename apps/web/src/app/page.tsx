'use client';

import { useState, useEffect } from 'react';
import { APP_CONFIG, HealthStatus, User } from '@repo/shared';
import {
  Server,
  Layers,
  Code2,
  Terminal,
  Activity,
  CheckCircle2,
  AlertCircle,
  Users,
  RefreshCw,
  ExternalLink,
  Cpu
} from 'lucide-react';

export default function Home() {
  const [apiHealth, setApiHealth] = useState<HealthStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const checkApiHealth = async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const res = await fetch(`http://localhost:${APP_CONFIG.DEFAULT_API_PORT}${APP_CONFIG.API_PREFIX}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setApiHealth(data.data);
    } catch (err: unknown) {
      setHealthError(err instanceof Error ? err.message : 'Failed to connect to API');
      setApiHealth(null);
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`http://localhost:${APP_CONFIG.DEFAULT_API_PORT}${APP_CONFIG.API_PREFIX}/users`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data.data || []);
    } catch {
      // If server is not yet running, display mock example
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    checkApiHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(255,255,255,0))] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-50 bg-slate-950/70">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              ⚡
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                {APP_CONFIG.APP_NAME}
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Monorepo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <a
              href={`http://localhost:${APP_CONFIG.DEFAULT_API_PORT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
            >
              API Status
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://github.com/ayush-shirode/Dhokla_Dominators_Vortexa"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-medium transition-all hover:bg-slate-800"
            >
              GitHub Repo
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full space-y-10 relative z-10">
        {/* Hero Section */}
        <div className="space-y-4 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Monorepo Workspace Configured & Ready
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Full-Stack Monorepo Architecture
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            Cleanly structured pnpm workspace connecting Next.js (App Router), Express (TypeScript) API, and shared types in a single repository.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Web App */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                <Code2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Port 3000
              </span>
            </div>
            <h3 className="font-bold text-lg text-white mb-1">apps/web</h3>
            <p className="text-slate-400 text-sm mb-4">
              Next.js 16 App Router with React 19, Tailwind CSS, and optimized bundle builds.
            </p>
            <div className="text-xs text-cyan-400 font-mono bg-cyan-950/30 border border-cyan-900/50 p-2.5 rounded-lg">
              pnpm --filter @repo/web dev
            </div>
          </div>

          {/* Backend API */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Server className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Port 5000
              </span>
            </div>
            <h3 className="font-bold text-lg text-white mb-1">apps/api</h3>
            <p className="text-slate-400 text-sm mb-4">
              Node.js Express + TypeScript backend with hot reloading via tsx and modular routing.
            </p>
            <div className="text-xs text-indigo-400 font-mono bg-indigo-950/30 border border-indigo-900/50 p-2.5 rounded-lg">
              pnpm --filter @repo/api dev
            </div>
          </div>

          {/* Shared Library */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                @repo/shared
              </span>
            </div>
            <h3 className="font-bold text-lg text-white mb-1">packages/shared</h3>
            <p className="text-slate-400 text-sm mb-4">
              Common TypeScript types, models, constants, and utilities consumed by both web and api.
            </p>
            <div className="text-xs text-amber-400 font-mono bg-amber-950/30 border border-amber-900/50 p-2.5 rounded-lg">
              pnpm --filter @repo/shared build
            </div>
          </div>
        </div>

        {/* Live Inter-Service Connectivity Checker */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/50 border border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Live Backend Connection Test</h2>
                <p className="text-slate-400 text-xs">Pings the Express API health endpoint directly from the Next.js client</p>
              </div>
            </div>

            <button
              onClick={checkApiHealth}
              disabled={loadingHealth}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
              Test API Connection
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 font-medium">API Endpoint</span>
                <span className="font-mono text-slate-500">GET /api/v1/health</span>
              </div>
              {apiHealth ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Status: {apiHealth.status.toUpperCase()}</span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-0.5 font-mono">
                    <div>Service: {apiHealth.service} (v{apiHealth.version})</div>
                    <div>Uptime: {Math.round(apiHealth.uptime)}s</div>
                    <div>Timestamp: {apiHealth.timestamp}</div>
                  </div>
                </div>
              ) : healthError ? (
                <div className="flex items-start gap-2 text-amber-400 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">Backend not reachable currently</span>
                    <p className="text-slate-400 mt-1">
                      Start both apps simultaneously with <code className="text-indigo-300">pnpm dev</code> to test the live connection.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">Pinging backend...</div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 font-medium">Shared Model Demo</span>
                <button
                  onClick={fetchUsers}
                  disabled={loadingUsers}
                  className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5" />
                  Fetch Users
                </button>
              </div>

              {users.length > 0 ? (
                <div className="space-y-1.5">
                  {users.map((u) => (
                    <div key={u.id} className="text-xs flex items-center justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                      <span className="text-slate-200">{u.name}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{u.email}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Shared interfaces like <code className="text-amber-300">User</code> and <code className="text-amber-300">ApiResponse&lt;T&gt;</code> guarantee end-to-end type safety between backend and frontend.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Commands Guide */}
        <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/60 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Workspace CLI Commands</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Start full stack (concurrently)</span>
              <code className="text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/50">pnpm dev</code>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Build all workspace packages</span>
              <code className="text-indigo-400 bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-900/50">pnpm build</code>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Start only frontend</span>
              <code className="text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/50">pnpm dev:web</code>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Start only backend API</span>
              <code className="text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/50">pnpm dev:api</code>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{APP_CONFIG.APP_NAME} &bull; Vortexa Hackathon</span>
          <div className="flex items-center gap-1 text-slate-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>Built with Next.js 16, Express, TypeScript &amp; pnpm</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
