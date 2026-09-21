import config from 'config';
import type { Request, Response } from 'express';

import { isLegalRepresentativeUser } from '../steps/utils/userRole';

import { buildManageCaseDetailsRedirect } from '@utils/manageCaseRedirect';

export function getCaseManagementUrl(req: Request): string | undefined {
  if (!isLegalRepresentativeUser(req)) {
    return undefined;
  }

  const caseDetailsBaseUrl = config.has('redirects.manageCaseReturnURL')
    ? config.get<string>('redirects.manageCaseReturnURL')
    : null;

  return buildManageCaseDetailsRedirect(caseDetailsBaseUrl, req.res?.locals.validatedCase?.id);
}

export function redirectToCaseManagement(res: Response, caseId?: string): void {
  const caseDetailsBaseUrl = config.has('redirects.manageCaseReturnURL')
    ? config.get<string>('redirects.manageCaseReturnURL')
    : null;
  if (caseDetailsBaseUrl && caseId) {
    const caseDetailsUrl = `${caseDetailsBaseUrl}/${caseId}`;
    return res.redirect(caseDetailsUrl);
  }

  res.status(404).send('Not Found');
}
