import type { Request } from 'express';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';
import { ENABLE_CUI_PCQ } from './respondToClaimFlags';

// Whether the PCQ (Equality and Diversity questionnaire) hand-off is enabled for this request.
// Defaults to false when LaunchDarkly or the flag is unavailable, so an unreachable flag service
// leaves the citizen on the normal journey rather than sending them somewhere unexpected.
export async function isPcqEnabled(req: Request): Promise<boolean> {
  return getLaunchDarklyFlag(req, ENABLE_CUI_PCQ, false);
}
