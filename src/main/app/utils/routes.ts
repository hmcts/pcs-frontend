export const DASHBOARD_ROUTE = '/dashboard';

export function getDashboardUrl(caseReference?: string | number): string {
  if (caseReference) {
    return `${DASHBOARD_ROUTE}/${caseReference}`;
  }
  return `${DASHBOARD_ROUTE}/1`; // TODO: remove the hardcoded 1 when we had real CCD backend setup
}
