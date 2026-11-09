import type { Request } from 'express';

import { getCaseReference } from '@modules/steps';

export function getApplicationId(req: Request): string | undefined {
  return req.session.applicationIds?.[getCaseReference(req)];
}

export function setApplicationId(req: Request, applicationId: string): void {
  (req.session.applicationIds ??= {})[getCaseReference(req)] = applicationId;
}

export function clearApplicationId(req: Request): void {
  delete req.session.applicationIds?.[getCaseReference(req)];
}
