import type { Request } from 'express';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';
import { CUI_WELSH_ENABLED } from './welshFlags';

// Whether CUI offers Welsh: the language toggle, Welsh pages and the "Which language" questions.
// Defaults to false (English only, questions skipped) when LaunchDarkly / the flag is unavailable.
export async function isCuiWelshEnabled(req: Request): Promise<boolean> {
  return getLaunchDarklyFlag(req, CUI_WELSH_ENABLED, false);
}
