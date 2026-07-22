import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { HTTPError } from '../HttpError';
import { isLegalRepresentativeUser } from '../steps/utils';

const LEGAL_REPRESENTATIVE_ALLOWED_PATHS = [
  /^\/case\/[^/]+\/respond-to-claim(?:\/.*)?$/,
  /^\/api\/postcode-lookup(?:\/.*)?$/,
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

  next(new HTTPError('Access denied', 403));
};
