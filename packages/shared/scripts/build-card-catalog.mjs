/**
 * Builds packages/shared/src/cardCatalog.generated.ts from the research CSV.
 *   node packages/shared/scripts/build-card-catalog.mjs   (or: pnpm build:card-catalog)
 *
 * Input:  ration_data/india_ration_entitlements.csv  (columns defined in docs/RESEARCH_PROMPT.md)
 * Rules:
 *  - Only AAY / PHH rows from an official source with confidence MEDIUM or HIGH carry a `rule`
 *    that the app may pre-fill (the user still has to confirm it).
 *  - Any other figure is kept as a `reference` hint, never pre-filled.
 *  - UNKNOWN stays unknown. Nothing is inferred from a card's name.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const csvPath = path.join(root, 'ration_data/india_ration_entitlements.csv');
const outPath = path.join(root, 'packages/shared/src/cardCatalog.generated.ts');

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') (field += '"', i++);
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') (row.push(field), (field = ''));
    else if (c === '\n') (row.push(field), rows.push(row), (row = []), (field = ''));
    else if (c !== '\r') field += c;
  }
  if (field || row.length) (row.push(field), rows.push(row));
  const [head, ...data] = rows.filter((r) => r.length > 1);
  return data.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

const clean = (s) => s.replace(/\s+/g, ' ').trim();
const known = (s) => s && s.toUpperCase() !== 'UNKNOWN';
const slug = (s) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const short = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const byState = new Map();
for (const r of rows) {
  if (!byState.has(r.state_code)) byState.set(r.state_code, []);
  byState.get(r.state_code).push(r);
}

// Categories that exist in a state's own ration card report but have no entitlement page.
const REPORT_SOURCE = {
  MH: {
    title: 'Maharashtra RCMS report — ration cards by category and district',
    url: 'https://rcms.mahafood.gov.in/Show_Reports.aspx?RID=98',
  },
};

const CAUTION_CONFLICT =
  "Another official page for this state lists a different figure (it may be out of date). Check your state's current order before relying on this.";

const catalog = {};
let checkedOn = '';
for (const [state, list] of [...byState].sort(([a], [b]) => a.localeCompare(b))) {
  const entries = [];
  const used = new Set();
  const primary = {};
  // Primary AAY / PHH rows: official source, MEDIUM or better, numeric figure.
  for (const r of list) {
    const nf = r.nfsa_category;
    if ((nf === 'AAY' || nf === 'PHH') && r.confidence !== 'LOW' && known(r.quantity_kg) && !primary[nf]) {
      primary[nf] = r;
      used.add(r);
    }
  }
  // Caution when the same state has another, differing source for the same NFSA category.
  const conflictFor = (nf) =>
    primary[nf]?.conflict === 'YES' || list.some((r) => r.nfsa_category === nf && r !== primary[nf] && r.quantity_kg !== undefined);

  for (const nf of ['AAY', 'PHH']) {
    const r = primary[nf];
    if (!r) continue;
    checkedOn = checkedOn > r.retrieved_on ? checkedOn : r.retrieved_on;
    const national = /nfsa\.gov\.in/.test(r.source_url);
    entries.push({
      id: `${state}-${nf.toLowerCase()}`,
      name: clean(r.card_name_as_printed),
      code: nf,
      nfsaCategory: nf,
      rule: { perUnitKg: Number(r.quantity_kg), basis: r.basis === 'PER_FAMILY' ? 'perFamily' : 'perMember' },
      reference: null,
      confidence: r.confidence,
      sourceTitle: clean(r.source_title),
      sourceUrl: r.source_url,
      sourceDate: known(r.source_date) ? r.source_date : null,
      checkedOn: r.retrieved_on,
      note: national
        ? "National NFSA scale. This state's own entitlement order was not checked."
        : `From the state's own page: ${short(clean(r.source_title), 110)}.`,
      caution: conflictFor(nf) ? CAUTION_CONFLICT : null,
    });
  }

  // Everything else: names only. A figure, if any, is only a hint.
  const rest = list.filter((r) => !used.has(r) && !((r.nfsa_category === 'AAY' || r.nfsa_category === 'PHH') && primary[r.nfsa_category]));
  const groups = new Map();
  for (const r of rest) {
    const base = clean(r.card_name_as_printed).replace(/\s+-\s+(rice|wheat|atta|coarse.*)$/i, '');
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(r);
  }
  for (const [base, rs] of groups) {
    const r = rs[0];
    checkedOn = checkedOn > r.retrieved_on ? checkedOn : r.retrieved_on;
    const figures = rs.filter((x) => known(x.quantity_kg));
    let reference = null;
    if (figures.length) {
      const per = (x) => (x.basis === 'PER_FAMILY' ? 'per family' : x.basis === 'PER_MEMBER' ? 'per person' : 'per card');
      const parts = figures.map((x) => {
        const com = (x.card_name_as_printed.match(/-\s*(rice|wheat|atta)\s*$/i) || [])[1];
        return `${x.quantity_kg} kg${com ? ' ' + com.toLowerCase() : ''} ${per(x)}`;
      });
      const when = known(r.source_date) ? `dated ${r.source_date}` : 'undated';
      reference = {
        text: `An official page (${when}) lists ${parts.join(' and ')}. It may be out of date or vary by month, so check it before using it.`,
        sourceUrl: r.source_url,
        sourceDate: known(r.source_date) ? r.source_date : null,
      };
    }
    const fallback = !r.source_url.startsWith('http') ? REPORT_SOURCE[state] : null;
    entries.push({
      id: `${state}-${slug(base)}`,
      name: base,
      code: known(r.card_code_or_colour) ? clean(r.card_code_or_colour) : null,
      nfsaCategory: 'OTHER',
      rule: null,
      reference,
      confidence: r.confidence,
      sourceTitle: fallback ? fallback.title : clean(r.source_title),
      sourceUrl: fallback ? fallback.url : r.source_url,
      sourceDate: known(r.source_date) ? r.source_date : null,
      checkedOn: r.retrieved_on,
      note: fallback
        ? "Listed in the state's own ration card report. No entitlement page was found, so you enter your own figure and its source."
        : 'Listed by the state. No current, confirmed entitlement figure was found, so you enter your own figure and its source.',
      caution: null,
    });
  }
  catalog[state] = entries;
}

const body = `// GENERATED by packages/shared/scripts/build-card-catalog.mjs — do not edit by hand.
// Source data: ration_data/india_ration_entitlements.csv (research dated ${checkedOn}).
import type { StateCardTypes } from './cardCatalog.js';

export const CARD_CATALOG_CHECKED_ON = ${JSON.stringify(checkedOn)};

export const STATE_CARD_TYPES: StateCardTypes = ${JSON.stringify(catalog, null, 1)};
`;
fs.writeFileSync(outPath, body);
const n = Object.values(catalog).reduce((s, l) => s + l.length, 0);
const pre = Object.values(catalog).flat().filter((e) => e.rule).length;
console.log(`✓ ${Object.keys(catalog).length} states, ${n} card categories (${pre} with a pre-fillable rule) → ${path.relative(root, outPath)}`);
