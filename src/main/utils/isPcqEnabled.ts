import type { Request } from 'express';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';
import { ENABLE_CUI_PCQ, RELEASE_1_3_ENABLED } from './respondToClaimFlags';

/**
 * Dual-gates the PCQ (Equality and Diversity questionnaire) hand-off.
 *
 * The citizen is only sent to PCQ when BOTH the shared release flag (`release-1.3-enabled`) and
 * the feature flag (`cui-pcq-enabled`) are on. The release flag keeps PCQ off until 1.3 ships; the
 * feature flag is an independent kill switch, so PCQ can be turned off in one environment without
 * pulling the whole release — worth having for a hand-off that depends on an external service.
 *
 * Both default to `false`, so the feature fails closed if LaunchDarkly is unavailable and the
 * citizen simply carries on with their response.
 */
export async function isPcqEnabled(req: Request): Promise<boolean> {
  const [releaseEnabled, featureEnabled] = await Promise.all([
    getLaunchDarklyFlag(req, RELEASE_1_3_ENABLED, false),
    getLaunchDarklyFlag(req, ENABLE_CUI_PCQ, false),
  ]);

  return releaseEnabled && featureEnabled;
}
