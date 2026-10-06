import type { Request } from 'express';

import { getLaunchDarklyFlag } from './getLaunchDarklyFlag';
import { WELSH_LANGUAGE_USED_ENABLED } from './welshFlags';

// Whether the "Which language did you use" questions are asked.
// Defaults to false (question skipped, English recorded) when LaunchDarkly / the flag is unavailable.
export async function isWelshLanguageUsedEnabled(req: Request): Promise<boolean> {
  return getLaunchDarklyFlag(req, WELSH_LANGUAGE_USED_ENABLED, false);
}
