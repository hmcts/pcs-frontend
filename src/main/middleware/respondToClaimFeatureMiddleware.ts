import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { handleRespondToClaimDisabled } from './handleRespondToClaimDisabled';

import {
  isRespondToClaimEnabledForRelease,
  isRespondToClaimEnabledForUser,
} from '@utils/isRespondToClaimEnabledForUser';

export function respondToClaimFeatureMiddleware(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const enabled = await isRespondToClaimEnabledForUser(req);
    const enabledForRelease = await isRespondToClaimEnabledForRelease(req);

    if (!enabledForRelease || !enabled) {
      handleRespondToClaimDisabled(req, res);
      return;
    }

    next();
  };
}
