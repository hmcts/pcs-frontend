import type { Request } from 'express';

import { ENABLE_CUI_YOUR_SUPPORT } from './cuiYourSupportFlags';
import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';

// Whether the CUI Your Support (Reasonable Adjustments) feature is enabled for this request.
// Defaults to false (feature off) when LaunchDarkly / the flag is unavailable.
export async function isCuiYourSupportEnabled(req: Request): Promise<boolean> {
  return getLaunchDarklyFlag(req, ENABLE_CUI_YOUR_SUPPORT, false);
}
