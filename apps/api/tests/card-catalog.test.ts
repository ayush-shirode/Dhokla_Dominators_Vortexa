import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CARD_CATALOG_CHECKED_ON,
  INDIAN_STATES,
  STATE_CARD_TYPES,
  buildReportSnapshot,
  checkNeutrality,
  getNfsaEntry,
  getOtherCardTypes,
  renderReportText,
  ruleFromEntry,
} from '@repo/shared';
import { openDb } from '../src/db/index.js';

const all = Object.values(STATE_CARD_TYPES).flat();

describe('state card catalog', () => {
  it('covers every state/UT with valid ISO codes', () => {
    const codes = new Set(INDIAN_STATES.map((s) => s.code));
    expect(Object.keys(STATE_CARD_TYPES).length).toBe(36);
    for (const code of Object.keys(STATE_CARD_TYPES)) expect(codes.has(code), code).toBe(true);
    for (const s of INDIAN_STATES) expect(STATE_CARD_TYPES[s.code]?.length, s.code).toBeGreaterThan(0);
  });

  it('every state has AAY and PHH with the figures from its source', () => {
    for (const code of Object.keys(STATE_CARD_TYPES)) {
      expect(getNfsaEntry(code, 'AAY')?.rule, `${code} AAY`).toEqual({ perUnitKg: 35, basis: 'perFamily' });
      expect(getNfsaEntry(code, 'PHH')?.rule, `${code} PHH`).toEqual({ perUnitKg: 5, basis: 'perMember' });
    }
  });

  it('never pre-fills a rule for other categories, or for low-confidence rows', () => {
    for (const e of all) {
      if (e.nfsaCategory === 'OTHER') expect(e.rule, e.id).toBeNull();
      if (e.rule) expect(e.confidence, e.id).not.toBe('LOW');
    }
  });

  it('every entry names its source and the date it was checked', () => {
    for (const e of all) {
      expect(e.sourceUrl, e.id).toMatch(/^https?:\/\//);
      expect(e.checkedOn, e.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.name.length, e.id).toBeGreaterThan(1);
    }
    expect(CARD_CATALOG_CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('warns where sources disagree (West Bengal) and nowhere else without reason', () => {
    expect(getNfsaEntry('WB', 'PHH')?.caution).toBeTruthy();
    expect(getNfsaEntry('MH', 'PHH')?.caution).toBeNull();
  });

  it('lists Maharashtra\'s own categories by name without a figure', () => {
    const names = getOtherCardTypes('MH').map((e) => e.name);
    expect(names).toEqual(expect.arrayContaining(['APL (Farmer)', 'BPL Yellow', 'NER']));
  });

  it('keeps old/undated figures as hints, never as rules', () => {
    const goa = getOtherCardTypes('GA').find((e) => e.name.startsWith('Above Poverty Line'));
    expect(goa?.rule).toBeNull();
    expect(goa?.reference?.text).toMatch(/2023/);
  });

  it('every text shown to users is neutral, and ruleFromEntry says it is unreviewed', () => {
    for (const e of all) {
      for (const t of [e.note, e.caution ?? '', e.reference?.text ?? '']) expect(checkNeutrality(t).ok, `${e.id}: ${t}`).toBe(true);
    }
    const r = ruleFromEntry(getNfsaEntry('KA', 'PHH')!)!;
    expect(r.sourceNote).toContain('not yet reviewed by a person');
    expect(r.lastVerified).toBe(getNfsaEntry('KA', 'PHH')!.checkedOn);
  });
});

describe('card name in reports', () => {
  it('shows the state\'s card name next to the card type', () => {
    const snap = buildReportSnapshot({
      household: { label: 'H', cardType: 'CUSTOM', cardName: 'APL (Farmer)', members: 4, rule: { perUnitKg: 5, basis: 'perMember', sourceTitle: 't', sourceUrl: null, sourceNote: 'n', lastVerified: null } },
      period: '2026-10',
      records: [],
      ruleConfirmedAt: '2026-10-11T00:00:00Z',
    });
    expect(renderReportText(snap, 'en')).toContain('Card type: CUSTOM — APL (Farmer)');
    expect(renderReportText(snap, 'hi')).toContain('CUSTOM — APL (Farmer)');
  });
});

describe('startup migration', () => {
  it('renames old state codes and adds the card name column', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rs-mig-')), 'old.db');
    const db = openDb(file);
    db.prepare("INSERT INTO devices (id, token_hash, created_at, last_seen_at) VALUES ('d','h','t','t')").run();
    for (const [id, st] of [['h1', 'CT'], ['h2', 'OR'], ['h3', 'UT'], ['h4', 'MH']] as const) {
      db.prepare("INSERT INTO households (id, device_id, label, card_type, members, rule_json, rule_fingerprint, state_code, created_at, updated_at) VALUES (?, 'd', 'x', 'PHH', 4, '{}', 'f', ?, 't', 't')").run(id, st);
    }
    db.close();
    const again = openDb(file);
    const codes = (again.prepare('SELECT id, state_code FROM households ORDER BY id').all() as Array<{ id: string; state_code: string }>).map((r) => r.state_code);
    expect(codes).toEqual(['CG', 'OD', 'UK', 'MH']);
    expect((again.prepare('PRAGMA table_info(households)').all() as Array<{ name: string }>).some((c) => c.name === 'card_name')).toBe(true);
  });
});
