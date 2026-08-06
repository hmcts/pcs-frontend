import type { Request } from 'express';

import { isRelease12Enabled } from './isRelease12Enabled';
import { isWalesProperty } from './isWalesProperty';

export function shouldShowExemptLandlordStep(req: Request): boolean {
  return isWalesProperty(req) && isRelease12Enabled(req);
}
