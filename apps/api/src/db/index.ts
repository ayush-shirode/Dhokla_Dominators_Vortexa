import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import { seedChannels } from './seed.js';

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  card_type TEXT NOT NULL,
  members INTEGER NOT NULL,
  rule_json TEXT NOT NULL,
  rule_fingerprint TEXT NOT NULL,
  rule_confirmed_at TEXT,
  state_code TEXT,
  district TEXT,
  fps_no TEXT,
  fps_name TEXT,
  client_updated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_households_device ON households(device_id);

CREATE TABLE IF NOT EXISTS checks (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  household_id TEXT NOT NULL,
  period TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  client_updated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_checks_device ON checks(device_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_checks_household_period ON checks(household_id, period) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL,
  date TEXT NOT NULL,
  quantity_g INTEGER NOT NULL,
  commodity TEXT,
  evidence_type TEXT NOT NULL,
  evidence_content TEXT,
  photo_id TEXT,
  unclear INTEGER NOT NULL DEFAULT 0,
  created_via TEXT NOT NULL,
  ai_assist_json TEXT,
  client_updated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_records_check ON records(check_id);
CREATE INDEX IF NOT EXISTS idx_records_device ON records(device_id);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  quality_json TEXT NOT NULL,
  sensitive_masked INTEGER NOT NULL DEFAULT 0,
  masking_performed INTEGER NOT NULL DEFAULT 0,
  doc_type_json TEXT NOT NULL,
  ocr_text TEXT,
  ocr_mean_conf REAL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  check_id TEXT,
  photo_id TEXT,
  engine TEXT NOT NULL,
  result_json TEXT NOT NULL,
  warnings_json TEXT NOT NULL,
  read_back_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL,
  household_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  language TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_check ON reports(check_id);

CREATE TABLE IF NOT EXISTS report_translations (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  text TEXT NOT NULL,
  draft_id TEXT NOT NULL,
  confirmed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grievance_drafts (
  check_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  state_code TEXT,
  district TEXT,
  fps_no TEXT,
  fps_name TEXT,
  description TEXT NOT NULL,
  description_language TEXT NOT NULL,
  description_source TEXT NOT NULL,
  based_on_report_id TEXT,
  portal_channel_id TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS filings (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL UNIQUE,
  report_id TEXT,
  reference_number TEXT NOT NULL,
  filed_date TEXT NOT NULL,
  portal_url TEXT,
  channel_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  state_code TEXT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  value TEXT NOT NULL,
  notes TEXT NOT NULL,
  accepted_languages_json TEXT,
  source_url TEXT,
  source_note TEXT NOT NULL,
  last_verified TEXT,
  verification_status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export type Db = DatabaseSync;

/** Old state codes (CT, OR, UT) were replaced by ISO codes (CG, OD, UK). Safe to run repeatedly. */
function migrate(conn: DatabaseSync): void {
  const cols = conn.prepare('PRAGMA table_info(households)').all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === 'card_name')) conn.exec('ALTER TABLE households ADD COLUMN card_name TEXT');
  for (const [from, to] of [['CT', 'CG'], ['OR', 'OD'], ['UT', 'UK']] as const) {
    for (const table of ['households', 'grievance_drafts', 'channels']) {
      conn.prepare(`UPDATE ${table} SET state_code = ? WHERE state_code = ?`).run(to, from);
    }
  }
}

let db: DatabaseSync | null = null;

export function openDb(file?: string): DatabaseSync {
  const target = file ?? (config.dbFile || path.join(config.dataDir, 'rationsaathi.db'));
  if (target !== ':memory:') fs.mkdirSync(path.dirname(target), { recursive: true });
  const conn = new DatabaseSync(target);
  conn.exec('PRAGMA journal_mode = WAL;');
  conn.exec(SCHEMA);
  migrate(conn);
  seedChannels(conn);
  return conn;
}

export function getDb(): DatabaseSync {
  if (!db) db = openDb();
  return db;
}

/** For tests: swap in a fresh database. */
export function setDb(conn: DatabaseSync): void {
  db = conn;
}

let txDepth = 0;

/** Runs fn in a transaction; nested calls become savepoints. fn must be synchronous. */
export function tx<T>(fn: () => T): T {
  const conn = getDb();
  const sp = `sp${txDepth}`;
  conn.exec(txDepth === 0 ? 'BEGIN' : `SAVEPOINT ${sp}`);
  txDepth++;
  try {
    const out = fn();
    txDepth--;
    conn.exec(txDepth === 0 ? 'COMMIT' : `RELEASE ${sp}`);
    return out;
  } catch (e) {
    txDepth--;
    conn.exec(txDepth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${sp}; RELEASE ${sp}`);
    throw e;
  }
}

export type Row = Record<string, string | number | null>;
