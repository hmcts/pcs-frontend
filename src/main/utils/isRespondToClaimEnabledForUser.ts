import type { Request } from 'express';

import { getUserType } from '../steps/utils';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';
import { CUI_RESPOND_TO_CLAIM_ENABLED, CUI_RESPOND_TO_CLAIM_LR_ENABLED, RELEASE_1_2_ENABLED } from './respondToClaimFlags';

export async function isRespondToClaimEnabledForUser(req: Request): Promise<boolean> {
  const flagName = getUserType(req) === 'legalrep' ? CUI_RESPOND_TO_CLAIM_LR_ENABLED : CUI_RESPOND_TO_CLAIM_ENABLED;

  return getLaunchDarklyFlag(req, flagName, false);
}

export async function isRespondToClaimEnabledForRelease(req: Request): Promise<boolean> {
  return getLaunchDarklyFlag(req, RELEASE_1_2_ENABLED, false);
}
