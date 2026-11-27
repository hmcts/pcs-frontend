import type { RequestHandler } from 'express';

import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';
import { CUI_GENAPP_SET_ASIDE } from '@utils/isGenAppCuiSetAsideEnabled';

export const genAppCuiSetAsideFeatureMiddleware: RequestHandler = async (req, res, next): Promise<void> => {
  res.locals.features ??= {};
  res.locals.features.genAppCuiSetAsideEnabled = await getLaunchDarklyFlag(req, CUI_GENAPP_SET_ASIDE, false);
  next();
};
