/**
 * Ration card categories per state / UT, from official pages (see ration_data/ and
 * docs/RESEARCH_PROMPT.md). Offline-friendly: bundled, never fetched.
 *
 * Principle 1: nothing here is applied silently. A `rule` is only a suggestion that the user sees,
 * can edit and must confirm. Categories without a rule are listed by name only; the household
 * types the figure and says where it comes from.
 */
import type { RuleBasis } from './types.js';
import { CARD_CATALOG_CHECKED_ON, STATE_CARD_TYPES } from './cardCatalog.generated.js';

export interface CardTypeEntry {
  id: string;
  /** Name exactly as the state prints it. */
  name: string;
  /** Local code or colour, if the state uses one. */
  code: string | null;
  /** AAY / PHH are the two NFSA categories; everything else is OTHER (state scheme or unknown). */
  nfsaCategory: 'AAY' | 'PHH' | 'OTHER';
  /** Pre-fillable suggestion (AAY/PHH only, official source, medium or better confidence). */
  rule: { perUnitKg: number; basis: RuleBasis } | null;
  /** A figure seen on an official page that is NOT pre-filled (old, undated or unclear). */
  reference: { text: string; sourceUrl: string; sourceDate: string | null } | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceTitle: string;
  sourceUrl: string;
  sourceDate: string | null;
  /** Date the research opened the source (YYYY-MM-DD). */
  checkedOn: string;
  note: string;
  /** Shown prominently when sources disagree. */
  caution: string | null;
}

export type StateCardTypes = Record<string, CardTypeEntry[]>;

export { CARD_CATALOG_CHECKED_ON, STATE_CARD_TYPES };

export function getStateCardTypes(stateCode: string | null | undefined): CardTypeEntry[] {
  return (stateCode && STATE_CARD_TYPES[stateCode]) || [];
}

/** The AAY or PHH entry for a state, if the research found one. */
export function getNfsaEntry(stateCode: string | null | undefined, category: 'AAY' | 'PHH'): CardTypeEntry | null {
  return getStateCardTypes(stateCode).find((e) => e.nfsaCategory === category) ?? null;
}

/** Card categories other than AAY/PHH that the state lists. */
export function getOtherCardTypes(stateCode: string | null | undefined): CardTypeEntry[] {
  return getStateCardTypes(stateCode).filter((e) => e.nfsaCategory === 'OTHER');
}

/** Turns a catalog entry into the editable rule the household form shows. */
export function ruleFromEntry(entry: CardTypeEntry) {
  if (!entry.rule) return null;
  return {
    perUnitKg: entry.rule.perUnitKg,
    basis: entry.rule.basis,
    sourceTitle: entry.sourceTitle,
    sourceUrl: entry.sourceUrl,
    sourceNote: `${entry.note} Source checked ${entry.checkedOn} by automated research; not yet reviewed by a person. State schemes may differ; edit the figure if yours does.`,
    lastVerified: entry.checkedOn,
  };
}
