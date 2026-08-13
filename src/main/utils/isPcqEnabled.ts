import type { Request } from 'express';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';
import { RELEASE_1_3_ENABLED } from './respondToClaimFlags';

// Whether the PCQ (Equality and Diversity questionnaire) hand-off is enabled for this request.
// Gated on the release-level flag rather than a feature-specific one, so PCQ ships with the rest
// of release 1.3 instead of being toggled independently.
//
// Defaults to false when LaunchDarkly or the flag is unavailable, so an unreachable flag service
// leaves the citizen on the normal journey rather than sending them somewhere unexpected.
export async function isPcqEnabled(req: Request): Promise<boolean> {
  return getLaunchDarklyFlag(req, RELEASE_1_3_ENABLED, false);
}
