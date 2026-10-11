import type { NeutralityResult } from '@repo/shared';

/** Non-judgmental guidance shown when checkNeutrality() flags text (FRONTEND_SPEC §1 P6, §13). */
export const NEUTRALITY_HINT = 'Please describe what was received, without saying who caused it. The report must stay neutral.';

export function flaggedTermsText(n: NeutralityResult): string {
  return [...new Set(n.flaggedTerms.map((f) => f.term))].join(', ');
}
