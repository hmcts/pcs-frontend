import config from 'config';
import type { Response } from 'express';

export function redirectToCaseManagement(res: Response, caseId?: string): void {
  const caseDetailsBaseUrl = config.has('redirects.manageCaseReturnURL')
    ? config.get<string>('redirects.manageCaseReturnURL')
    : null;
  if (caseDetailsBaseUrl) {
    const caseDetailsUrl = `${caseDetailsBaseUrl}/${caseId}`;
    res.redirect(caseDetailsUrl);
  }
}
