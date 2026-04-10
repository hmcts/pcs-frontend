/** Env keys set in `respondToAClaim.spec.ts` `beforeEach` (plus `CASE_NUMBER` from submit). */
export const RESPOND_TO_CLAIM_BEFORE_EACH_ENV_KEYS = [
  'CASE_NUMBER',
  'CLAIMANT_NAME',
  'CLAIMANT_NAME_OVERRIDDEN',
  'CORRESPONDENCE_ADDRESS',
  'GROUNDS',
  'NOTICE_DATE_PROVIDED',
  'NOTICE_DETAILS_NO_NOTSURE',
  'NOTICE_SERVED',
  'RENT_NON_RENT',
  'TENANCY_START_DATE_KNOWN',
  'TENANCY_TYPE',
] as const;

export const DASHBOARD_BEFORE_EACH_ENV_KEYS = ['CASE_NUMBER', 'GROUNDS', 'NOTICE_SERVED', 'TENANCY_TYPE'] as const;

export const RESPOND_TO_CLAIM_WALES_BEFORE_EACH_ENV_KEYS = ['CASE_NUMBER', 'CLAIMANT_NAME', 'WALES_POSTCODE'] as const;

/** One line per spec when `ENABLE_PFT_DEBUG_LOG=true`. */
export function logTestEnvAfterBeforeEach(testTitle: string, keys: readonly string[]): void {
  if (process.env.ENABLE_PFT_DEBUG_LOG !== 'true') {
    return;
  }
  const kv = keys.map(key => `${key}=${process.env[key] ?? ''}`).join(' ');
  console.log(`[test env] ${testTitle} | ${kv}`);
}
