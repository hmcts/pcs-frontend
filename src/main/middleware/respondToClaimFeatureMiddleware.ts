import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isLegalRepresentativeUser } from '../steps/utils';

import { handleRespondToClaimDisabled } from './handleRespondToClaimDisabled';

import {
  isRespondToClaimEnabledForRelease,
  isRespondToClaimEnabledForUser,
} from '@utils/isRespondToClaimEnabledForUser';

export const respondToClaimFeatureMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (isLegalRepresentativeUser(req)) {
    const isReleaseEnabled = await isRespondToClaimEnabledForRelease(req);
    if (!isReleaseEnabled) {
      return handleRespondToClaimDisabled(req, res);
    }
  }

  const isUserEnabled = await isRespondToClaimEnabledForUser(req);
  if (!isUserEnabled) {
    return handleRespondToClaimDisabled(req, res);
  }

  next();
};
