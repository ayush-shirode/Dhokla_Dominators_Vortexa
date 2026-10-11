/**
 * Guards that enforce Core Principles 5/6 (neutral language) and the privacy rules
 * (never retain Aadhaar / VID numbers). Pure functions, usable offline.
 */
import type { NeutralityResult } from './types.js';

// ---------------------------------------------------------------------------
// Neutral-language guard
// ---------------------------------------------------------------------------

/**
 * Latin-script patterns (English + common Hindi/Hinglish transliterations). Matched
 * case-insensitively at a word start. Patterns describe accusation of wrongdoing; they are
 * deliberately conservative and are used to block generated/stored text, never to label a case.
 */
const LATIN_PATTERNS: string[] = [
  'fraud\\w*', 'theft\\w*', 'thie(?:f|ves|ving)\\b', 'steal\\w*', 'stole\\w*', 'cheat\\w*', 'corrupt\\w*',
  'scam\\w*', 'embezzl\\w*', 'misappropriat\\w*', 'siphon\\w*', 'divert(?:ed|ing|s)?\\b', 'diversion\\b',
  'black[\\s-]?market\\w*', 'brib\\w*', 'loot\\w*', 'swindl\\w*', 'pilfer\\w*', 'illegal\\w*', 'guilty\\b',
  'culprit\\w*', 'dishonest\\w*', 'crook\\w*', 'criminal\\w*', 'crime\\w*', 'extort\\w*', 'racket\\w*',
  'suspicious\\w*', 'kickback\\w*', 'pocketed\\b', 'kept the rest\\b', 'sold (?:it|them|our|my|the) (?:grain|ration|rice|wheat)',
  'took (?:our|my|the) (?:grain|ration|rice|wheat)',
  // transliterated Hindi / Hinglish
  'chori\\b', 'chor\\b', 'dhokha\\w*', 'dhoka\\w*', 'ghotal\\w*', 'ghapl\\w*', 'bhrasht\\w*', 'rishwat\\w*',
  'kala ?bazar\\w*', 'kaala ?baazar\\w*', 'beiman\\w*', 'beimaan\\w*', 'herapheri\\b', 'hera ?pheri\\b', 'thagi\\b',
];

/** Non-Latin script terms (substring match). Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Urdu. */
const SCRIPT_TERMS: string[] = [
  // Hindi / Marathi (Devanagari)
  'चोरी', 'चोर', 'धोखाधड़ी', 'धोखा', 'भ्रष्टाचार', 'भ्रष्ट', 'घोटाला', 'घपला', 'रिश्वत', 'कालाबाज़ारी', 'कालाबाजारी',
  'बेईमान', 'हेराफेरी', 'ठगी', 'लूट', 'गबन', 'फसवणूक', 'लाचखोरी',
  // Bengali / Assamese
  'চুরি', 'দুর্নীতি', 'প্রতারণা',
  // Tamil
  'திருட்டு', 'ஊழல்', 'மோசடி',
  // Telugu
  'దొంగ', 'అవినీతి', 'మోసం',
  // Gujarati
  'ચોરી', 'ભ્રષ્ટાચાર', 'છેતરપિંડી',
  // Kannada
  'ಕಳ್ಳತನ', 'ಭ್ರಷ್ಟಾಚಾರ', 'ವಂಚನೆ',
  // Malayalam
  'മോഷണം', 'അഴിമതി', 'തട്ടിപ്പ്',
  // Punjabi (Gurmukhi)
  'ਚੋਰੀ', 'ਭ੍ਰਿਸ਼ਟਾਚਾਰ', 'ਧੋਖਾ',
  // Odia
  'ଚୋରି', 'ଦୁର୍ନୀତି',
  // Urdu
  'چوری', 'بدعنوانی', 'دھوکہ',
];

const LATIN_RE = new RegExp(`(?<![\\p{L}\\p{N}])(?:${LATIN_PATTERNS.join('|')})`, 'giu');

/**
 * Checks text for words that state or imply fraud, theft or wrongdoing.
 * Used on: generated report/grievance text (must always pass), AI translations,
 * user-entered evidence notes and user-edited grievance descriptions.
 */
export function checkNeutrality(text: string): NeutralityResult {
  const flagged: Array<{ term: string; index: number }> = [];
  if (!text) return { ok: true, flaggedTerms: [] };

  for (const m of text.matchAll(LATIN_RE)) {
    flagged.push({ term: m[0], index: m.index ?? 0 });
  }
  for (const term of SCRIPT_TERMS) {
    let from = 0;
    for (;;) {
      const idx = text.indexOf(term, from);
      if (idx === -1) break;
      // Skip if this position is already covered by a longer flagged term.
      if (!flagged.some((f) => idx >= f.index && idx < f.index + f.term.length)) {
        flagged.push({ term, index: idx });
      }
      from = idx + term.length;
    }
  }
  flagged.sort((a, b) => a.index - b.index);
  return { ok: flagged.length === 0, flaggedTerms: flagged };
}

// ---------------------------------------------------------------------------
// Sensitive ID redaction (Aadhaar / VID)
// ---------------------------------------------------------------------------

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function verhoeffValid(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let c = 0;
  const rev = digits.split('').reverse();
  for (let i = 0; i < rev.length; i++) {
    c = VERHOEFF_D[c]![VERHOEFF_P[i % 8]![Number(rev[i])]!]!;
  }
  return c === 0;
}

/** 12-digit Aadhaar number: first digit 2–9 and a valid Verhoeff checksum. */
export function isLikelyAadhaar(digits: string): boolean {
  return /^[2-9]\d{11}$/.test(digits) && verhoeffValid(digits);
}

/** 16-digit Aadhaar Virtual ID with a valid Verhoeff checksum. */
export function isLikelyVid(digits: string): boolean {
  return /^\d{16}$/.test(digits) && verhoeffValid(digits);
}

export const REDACTION_MARK = '[ID REMOVED]';

const VID_RE = /(?<!\d)(\d{4})[ \-.]?(\d{4})[ \-.]?(\d{4})[ \-.]?(\d{4})(?!\d)/g;
const AADHAAR_RE = /(?<!\d)([2-9]\d{3})[ \-.]?(\d{4})[ \-.]?(\d{4})(?!\d)/g;

/**
 * Replaces Aadhaar numbers and VIDs with REDACTION_MARK. Already-masked forms such as
 * "XXXX XXXX 1234" are left alone. Numbers that fail the checksum are left alone (they are
 * not valid IDs), which keeps most receipt/transaction numbers intact.
 */
export function redactSensitiveIds(text: string): { text: string; count: number } {
  if (!text) return { text: text ?? '', count: 0 };
  let count = 0;
  let out = text.replace(VID_RE, (m, a: string, b: string, c: string, d: string) => {
    if (isLikelyVid(a + b + c + d)) {
      count++;
      return REDACTION_MARK;
    }
    return m;
  });
  out = out.replace(AADHAAR_RE, (m, a: string, b: string, c: string) => {
    if (isLikelyAadhaar(a + b + c)) {
      count++;
      return REDACTION_MARK;
    }
    return m;
  });
  return { text: out, count };
}

/** Finds Aadhaar/VID candidates in a list of OCR word tokens (for masking image regions). */
export function findSensitiveTokenRuns(tokens: string[]): Array<{ start: number; end: number }> {
  const runs: Array<{ start: number; end: number }> = [];
  const digitsOnly = tokens.map((t) => t.replace(/[^\d]/g, ''));
  for (let i = 0; i < tokens.length; i++) {
    let acc = '';
    for (let j = i; j < Math.min(tokens.length, i + 4); j++) {
      const d = digitsOnly[j]!;
      if (!d || d.length !== tokens[j]!.replace(/[ \-.]/g, '').length) break; // token must be purely numeric
      acc += d;
      if ((acc.length === 12 && isLikelyAadhaar(acc)) || (acc.length === 16 && isLikelyVid(acc))) {
        runs.push({ start: i, end: j });
        break;
      }
      if (acc.length > 16) break;
    }
  }
  return runs;
}
