import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isLegalRepresentativeUser, isStaffUser } from '../steps/utils/userRole';
import { isMakeAClaimEnabled } from '../utils/makeAClaimFlags';

/** Every path the private landlord make a claim journey serves, with or without a case. */
export const MAKE_A_CLAIM_PATHS = [
  /^\/make-a-claim(?:\/.*)?$/,
  /^\/case\/[^/]+\/make-a-claim(?:\/.*)?$/,
  /^\/case\/[^/]+\/pay-claim-fee(?:\/.*)?$/,
  /^\/case\/[^/]+\/claim-submitted(?:\/.*)?$/,
] as const;

export function isMakeAClaimPath(path: string): boolean {
  return MAKE_A_CLAIM_PATHS.some(pattern => pattern.test(path));
}

function notFound(res: Response): void {
  res.status(404).send('Not Found');
}

/**
 * Shows the private landlord make a claim journey as not existing while its feature flag is off (and if
 * LaunchDarkly is unavailable). It is for citizens only: legal representatives and staff are never shown it.
 */
export const makeAClaimFeatureMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (isLegalRepresentativeUser(req) || isStaffUser(req)) {
    return notFound(res);
  }
  if (await isMakeAClaimEnabled(req)) {
    return next();
  }
  notFound(res);
};

/** Applies {@link makeAClaimFeatureMiddleware} to the journey's paths, ahead of any route that serves them. */
export const makeAClaimPathsFeatureMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!isMakeAClaimPath(req.path)) {
    return next();
  }
  await makeAClaimFeatureMiddleware(req, res, next);
};
