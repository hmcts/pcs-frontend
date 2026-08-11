import type { Request } from 'express';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';
import { RELEASE_1_2_ENABLED } from './respondToClaimFlags';

export async function isAccessControlEnabled(req: Request): Promise<boolean> {
  return getLaunchDarklyFlag(req, RELEASE_1_2_ENABLED, true);
}
