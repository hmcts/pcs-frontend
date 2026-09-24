import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { isLegalRepresentativeUser } from '../steps/utils';

import { handleRespondToClaimDisabled } from './handleRespondToClaimDisabled';

import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';
import {
  isRespondToClaimEnabledForRelease,
  isRespondToClaimEnabledForUser,
} from '@utils/isRespondToClaimEnabledForUser';
import { RELEASE_1_4_ENABLED } from '@utils/respondToClaimFlags';

export const respondToClaimFeatureMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const isReleaseEnabled = await isRespondToClaimEnabledForRelease(req);
  res.locals.release12Enabled = isReleaseEnabled;
  res.locals.release14Enabled = await getLaunchDarklyFlag(req, RELEASE_1_4_ENABLED, false);

  if (isLegalRepresentativeUser(req) && !isReleaseEnabled) {
    return handleRespondToClaimDisabled(req, res);
  }

  const isUserEnabled = await isRespondToClaimEnabledForUser(req);
  if (!isUserEnabled) {
    return handleRespondToClaimDisabled(req, res);
  }

  next();
};
