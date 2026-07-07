import type { Request, Response } from 'express';

import { getUserType } from '../steps/utils';

import { getDashboardUrl } from '@routes/dashboard';
import { sanitiseCaseReference } from '@utils/caseReference';
import { safeRedirect303 } from '@utils/safeRedirect';

function getCaseReferenceFromRequest(req: Request): string | undefined {
  const validatedCaseId = req.res?.locals.validatedCase?.id;
  if (validatedCaseId) {
    return String(validatedCaseId);
  }

  const paramCaseReference = req.params.caseReference;
  if (typeof paramCaseReference === 'string') {
    return sanitiseCaseReference(paramCaseReference) ?? undefined;
  }

  return undefined;
}

export function handleRespondToClaimDisabled(req: Request, res: Response): void {
  if (getUserType(req) === 'legalrep') {
    res.status(404).send('Not Found');
    return;
  }

  const dashboardUrl = getDashboardUrl(getCaseReferenceFromRequest(req)) ?? '/';
  safeRedirect303(res, dashboardUrl, '/', ['/case', '/']);
}
