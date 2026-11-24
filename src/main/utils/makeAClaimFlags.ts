import type { Request } from 'express';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';

export const PRIVATE_LANDLORD_MAKE_A_CLAIM_ENABLED = 'private-landlord-make-a-claim-enabled';

/** Whether the journey is switched on, asked of LaunchDarkly once per request however many gates check it. */
export async function isMakeAClaimEnabled(req: Request): Promise<boolean> {
  const locals = req.res?.locals;
  if (typeof locals?.makeAClaimEnabled === 'boolean') {
    return locals.makeAClaimEnabled;
  }
  const enabled = await getLaunchDarklyFlag(req, PRIVATE_LANDLORD_MAKE_A_CLAIM_ENABLED, false);
  if (locals) {
    locals.makeAClaimEnabled = enabled;
  }
  return enabled;
}
