import type { Request } from 'express';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';
import { ENABLE_UNCATEGORISED_DOCUMENTS, RELEASE_1_2_ENABLED } from './respondToClaimFlags';

/**
 * Dual-gates the Uncategorised documents folder on the view-documents page.
 *
 * The folder is only shown when BOTH the shared release flag (`release-1.2-enabled`)
 * and the journey flag (`uncategorised-documents-enabled`) are on. Both default to
 * `false`, so the feature fails closed if LaunchDarkly is unavailable.
 *
 * view-documents is an async route outside the respond-to-claim middleware stack, so
 * we evaluate LaunchDarkly directly here rather than reading `res.locals.release12Enabled`.
 */
export async function isUncategorisedDocumentsEnabled(req: Request): Promise<boolean> {
  const [releaseEnabled, journeyEnabled] = await Promise.all([
    getLaunchDarklyFlag(req, RELEASE_1_2_ENABLED, false),
    getLaunchDarklyFlag(req, ENABLE_UNCATEGORISED_DOCUMENTS, false),
  ]);

  return releaseEnabled && journeyEnabled;
}
