import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isLegalRepresentativeUser } from '../steps/utils';

import { handleRespondToClaimDisabled } from './handleRespondToClaimDisabled';

const LEGAL_REPRESENTATIVE_SPECIFC_ALLOWED_PATHS = [
  /^\/case\/[^/]+\/respond-to-claim\/select-defendant$/
];

export const legalRepresentativeSpecificStepsAccessMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (isLegalRepresentativeUser(req)) {
    return next();
  }

  const isLegalRepresentativeSpecificPath = LEGAL_REPRESENTATIVE_SPECIFC_ALLOWED_PATHS.some(pattern => pattern.test(req.path));

  if (!isLegalRepresentativeSpecificPath) {
    return next();
  }

  handleRespondToClaimDisabled(req, res);
};
