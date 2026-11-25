import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isLegalRepresentativeUser } from '../steps/utils';

const LEGAL_REPRESENTATIVE_ALLOWED_PATHS = [
  /^\/case\/[^/]+\/respond-to-claim(?:\/.*)?$/,
  /^\/case\/[^/]+\/view-documents(?:\/.*)?$/,
  // TODO HDPI-7344: temporary, to test locally as pcs-solicitor1 until the bailiff roles are in
  /^\/case\/[^/]+\/schedule-eviction(?:\/.*)?$/,
  /^\/cases\/[^/]+\/event\/[^/]+(?:\/.*)?$/,
  /^\/payment\/return\/[^/]+(?:\/.*)?$/,
  /^\/api\/postcode-lookup(?:\/.*)?$/,
  /^\/accessibility$/,
  /^\/privacy-policy$/,
  /^\/cookies$/,
  /^\/terms-and-conditions$/,
  /^\/get-help$/,
];

export const legalRepresentativeAccessMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isLegalRepresentativeUser(req)) {
    return next();
  }

  const isAllowed = LEGAL_REPRESENTATIVE_ALLOWED_PATHS.some(pattern => pattern.test(req.path));

  if (isAllowed) {
    return next();
  }

  res.status(404).send('Not Found');
};
