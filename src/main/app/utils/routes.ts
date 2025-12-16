export const DASHBOARD_ROUTE = '/dashboard';

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

function sanitizeCaseReference(caseReference: string | number): string | null {
  const caseRefStr = String(caseReference);
  if (!/^\d{16}$/.test(caseRefStr)) {
    return null;
  }
  return caseRefStr;
}

export function getDashboardUrl(caseReference?: string | number): string {
  if (caseReference) {
    const sanitized = sanitizeCaseReference(caseReference);
    if (!sanitized) {
      return `${DASHBOARD_ROUTE}/1`;
    }
    const url = `${DASHBOARD_ROUTE}/${sanitized}`;
    if (!isValidRedirectUrl(url)) {
      return `${DASHBOARD_ROUTE}/1`;
    }
    return url;
  }
  return `${DASHBOARD_ROUTE}/1`; // TODO: remove the hardcoded 1 when we had real CCD backend setup
}
