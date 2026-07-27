import type { Request } from 'express';

import { getUserType } from '../steps/utils';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';
import {
  ENABLE_CUI_RESPOND_TO_CLAIM,
  ENABLE_CUI_RESPOND_TO_CLAIM_LR,
  RELEASE_1_2_ENABLED,
} from './respondToClaimFlags';

export async function isRespondToClaimEnabledForUser(req: Request): Promise<boolean> {
  const flagName = getUserType(req) === 'legalrep' ? ENABLE_CUI_RESPOND_TO_CLAIM_LR : ENABLE_CUI_RESPOND_TO_CLAIM;

  return getLaunchDarklyFlag(req, flagName, false);
}

export async function isRespondToClaimEnabledForRelease(req: Request): Promise<boolean> {
  return getLaunchDarklyFlag(req, RELEASE_1_2_ENABLED, false);
}
