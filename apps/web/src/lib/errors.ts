/** Maps an API error code to a catalog key, so error messages follow the UI language. */
const BY_CODE: Record<string, string> = {
  NETWORK_ERROR: 'errors.network',
  NEUTRALITY_CHECK_FAILED: 'errors.neutrality',
  RULE_NOT_CONFIRMED: 'errors.ruleNotConfirmed',
  RATE_LIMITED: 'errors.rateLimited',
  AI_UNAVAILABLE: 'errors.aiUnavailable',
  AI_FAILED: 'errors.aiFailed',
  VALIDATION_FAILED: 'errors.validation',
  CLOUD_CONSENT_REQUIRED: 'errors.consent',
};

export function errorKey(err: unknown, fallback = 'errors.generic'): string {
  const code = (err as { code?: string } | null)?.code;
  return (code && BY_CODE[code]) || fallback;
}
