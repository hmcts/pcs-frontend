export const DASHBOARD_ROUTE = '/dashboard';
const DEFAULT_DASHBOARD_URL = `${DASHBOARD_ROUTE}/1`; // TODO: remove the hardcoded 1 when we had real CCD backend setup

/**
 * Validates a redirect URL to prevent open redirect vulnerabilities.
 */
export function isValidRedirectUrl(url: string | null): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  if (!url.startsWith('/')) {
    return false;
  }

  if (url.startsWith('//')) {
    return false;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    return false;
  }

  if (url.includes('\0') || url.includes('\r') || url.includes('\n')) {
    return false;
  }

  return true;
}

/**
 * Validates and sanitises a case reference to ensure it's a safe 16-digit number.
 * This prevents injection attacks by only allowing numeric input of exactly 16 digits.
 */
function sanitiseCaseReference(caseReference: string | number): string | null {
  const caseRefStr = String(caseReference);
  if (!/^\d{16}$/.test(caseRefStr)) {
    return null;
  }
  return caseRefStr;
}

/**
 * Gets a dashboard URL for a given case reference.
 * Uses a whitelist approach to prevent open redirect vulnerabilities:
 * - Only allows URLs matching the pattern /dashboard/{16-digit-number}
 * - Falls back to default URL if validation fails
 * - All user input is strictly validated before being used in the URL
 */
export function getDashboardUrl(caseReference?: string | number): string {
  if (!caseReference) {
    return DEFAULT_DASHBOARD_URL;
  }

  const sanitised = sanitiseCaseReference(caseReference);
  if (!sanitised) {
    return DEFAULT_DASHBOARD_URL;
  }

  const url = `${DASHBOARD_ROUTE}/${sanitised}`;

  const expectedPattern = /^\/dashboard\/\d{16}$/;
  if (!expectedPattern.test(url)) {
    return DEFAULT_DASHBOARD_URL;
  }

  return isValidRedirectUrl(url) ? url : DEFAULT_DASHBOARD_URL;
}
