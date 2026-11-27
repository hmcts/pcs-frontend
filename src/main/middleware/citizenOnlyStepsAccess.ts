import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isLegalRepresentativeUser } from '../steps/utils';

import { handleRespondToClaimDisabled } from './handleRespondToClaimDisabled';

// Block Legal Reps from using YourSupport (instead they use XUI)
const CITIZEN_ONLY_PATHS = [
  /^\/case\/[^/]+\/respond-to-claim\/reasonable-adjustments(?:-triage|-confirmation|-cancelled|-error|\/callback\/[^/]+)$/,
];

export const citizenOnlyStepsAccessMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isLegalRepresentativeUser(req)) {
    return next();
  }

  //normalise path before matching
  const path = req.path.replace(/\/+$/, '').toLowerCase();
  const isCitizenOnlyPath = CITIZEN_ONLY_PATHS.some(pattern => pattern.test(path));
  if (!isCitizenOnlyPath) {
    return next();
  }

  // Same bounce as the sibling legal-rep guard: legal representatives go back to Manage Case.
  handleRespondToClaimDisabled(req, res);
};
