export const DASHBOARD_ROUTE = '/dashboard';

export function getDashboardUrl(caseReference?: string | number): string {
  if (caseReference) {
    return `${DASHBOARD_ROUTE}/${caseReference}`;
  }
  return DASHBOARD_ROUTE;
}
