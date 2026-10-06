import type { Request } from 'express';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';
import { CUI_WELSH_TOGGLE_ENABLED } from './welshFlags';

// Whether CUI pages may render in Welsh and show the English / Cymraeg toggle.
// Defaults to false (English only) when LaunchDarkly / the flag is unavailable.
export async function isWelshToggleEnabled(req: Request): Promise<boolean> {
  return getLaunchDarklyFlag(req, CUI_WELSH_TOGGLE_ENABLED, false);
}
