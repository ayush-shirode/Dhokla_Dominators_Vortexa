import type { DatabaseSync } from 'node:sqlite';
import type { GrievanceChannelInput } from '@repo/shared';
import { NFSA_STATE_PORTALS_SOURCE, STATE_CARD_PORTALS } from './statePortals.js';

/**
 * Initial grievance-channel directory. Every entry is marked UNVERIFIED with lastVerified = null:
 * the research behind this project could not fully verify these channels (Spec §4.4, §7).
 * Maintain them through the admin endpoints after checking the official sources; seeds never
 * overwrite an entry that already exists.
 */
export const SEED_CHANNELS: Array<GrievanceChannelInput & { id: string }> = [
  {
    id: 'national-nfsa-portal',
    scope: 'national',
    stateCode: null,
    name: 'NFSA portal — Department of Food & Public Distribution',
    kind: 'portal',
    value: 'https://nfsa.gov.in/',
    notes:
      'Official national NFSA portal. Use its grievance option to lodge a complaint; the exact page may change. You complete the Aadhaar OTP and submit there yourself — RationSaathi never does.',
    acceptedLanguages: null,
    sourceUrl: 'https://nfsa.gov.in/',
    sourceNote: 'Domain named in the RationSaathi specification. The grievance page path and accepted languages have not been verified.',
    lastVerified: null,
    verificationStatus: 'unverified',
  },
  {
    id: 'national-cpgrams',
    scope: 'national',
    stateCode: null,
    name: 'CPGRAMS — Centralised Public Grievance Redress and Monitoring System',
    kind: 'other',
    value: 'https://pgportal.gov.in/',
    notes: 'Government of India public grievance portal. It can also be used for PDS-related grievances. Check the portal for the right department.',
    acceptedLanguages: null,
    sourceUrl: 'https://pgportal.gov.in/',
    sourceNote: 'Not verified for PDS entitlement grievances during research.',
    lastVerified: null,
    verificationStatus: 'unverified',
  },
  {
    id: 'national-state-helpline-1967',
    scope: 'national',
    stateCode: null,
    name: 'State food & civil supplies helpline (1967 / toll-free)',
    kind: 'helpline',
    value: '1967',
    notes:
      'Many states run the short code 1967 and/or an 1800 toll-free number for ration (PDS) complaints. It does not work in every state or on every network. Check your state food department website for the current number.',
    acceptedLanguages: null,
    sourceUrl: null,
    sourceNote: 'Commonly cited; not verified state-by-state during research.',
    lastVerified: null,
    verificationStatus: 'unverified',
  },
  {
    id: 'national-dgro',
    scope: 'national',
    stateCode: null,
    name: 'District Grievance Redressal Officer (DGRO)',
    kind: 'dgro',
    value: 'National Food Security Act, 2013 — Section 15',
    notes:
      'The Act provides for a District Grievance Redressal Officer in each district to hear grievances about entitled foodgrains. Ask your district supply office or state helpline for your DGRO\'s contact details.',
    acceptedLanguages: null,
    sourceUrl: 'https://www.indiacode.nic.in/',
    sourceNote: 'National Food Security Act, 2013, Sections 14–15 (Act text on indiacode.nic.in). DGRO process details vary by state and were not verified.',
    lastVerified: null,
    verificationStatus: 'unverified',
  },
  {
    id: 'national-state-food-commission',
    scope: 'national',
    stateCode: null,
    name: 'State Food Commission (appeal)',
    kind: 'state_food_commission',
    value: 'National Food Security Act, 2013 — Section 16',
    notes: 'If you are not satisfied with the DGRO\'s order, the Act provides for an appeal to the State Food Commission.',
    acceptedLanguages: null,
    sourceUrl: 'https://www.indiacode.nic.in/',
    sourceNote: 'National Food Security Act, 2013, Section 16. State-specific procedure not verified.',
    lastVerified: null,
    verificationStatus: 'unverified',
  },
];

/**
 * State/UT ration card portals, from the official NFSA list. Only entries whose link answered
 * (HTTP 200) are marked verified; the rest are "needs review" with what we saw, never assumed.
 */
export const STATE_PORTAL_CHANNELS: Array<GrievanceChannelInput & { id: string }> = STATE_CARD_PORTALS.map((p) => {
  const ok = p.httpStatus === 200;
  const seen =
    p.httpStatus === 0
      ? 'did not connect from our test network (government sites often block overseas networks, so this does not prove it is down)'
      : `returned HTTP ${p.httpStatus} when we tested it`;
  return {
    id: p.id,
    scope: 'state',
    stateCode: p.stateCode,
    name: `${p.name} — ration card details`,
    kind: 'card_portal',
    value: p.url,
    notes:
      'Official state portal where ration card details and reports are published. Use it to look up card, shop (FPS) and district details. Some pages need a captcha.',
    acceptedLanguages: null,
    sourceUrl: NFSA_STATE_PORTALS_SOURCE.url,
    sourceNote: ok
      ? `Listed on the NFSA website (checked ${NFSA_STATE_PORTALS_SOURCE.checkedOn}); the link responded.`
      : `Listed on the NFSA website (checked ${NFSA_STATE_PORTALS_SOURCE.checkedOn}); the link ${seen}.`,
    lastVerified: ok ? NFSA_STATE_PORTALS_SOURCE.checkedOn : null,
    verificationStatus: ok ? 'verified' : 'needs_review',
  };
});

export const DEFAULT_PORTAL_CHANNEL_ID = 'national-nfsa-portal';

export function seedChannels(db: DatabaseSync): void {
  const stmt = db.prepare(`INSERT OR IGNORE INTO channels
    (id, scope, state_code, name, kind, value, notes, accepted_languages_json, source_url, source_note, last_verified, verification_status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const now = new Date().toISOString();
  for (const c of [...SEED_CHANNELS, ...STATE_PORTAL_CHANNELS]) {
    stmt.run(
      c.id, c.scope, c.stateCode, c.name, c.kind, c.value, c.notes,
      c.acceptedLanguages ? JSON.stringify(c.acceptedLanguages) : null,
      c.sourceUrl, c.sourceNote, c.lastVerified, c.verificationStatus, now,
    );
  }
}
