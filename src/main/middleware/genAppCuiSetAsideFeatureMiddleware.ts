import type { RequestHandler } from 'express';

import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';
import { GENAPP_CUI_SET_ASIDE } from '@utils/isGenAppCuiSetAsideEnabled';

export const genAppCuiSetAsideFeatureMiddleware: RequestHandler = async (req, res, next): Promise<void> => {
  res.locals.features ??= {};
  res.locals.features.genAppCuiSetAsideEnabled = await getLaunchDarklyFlag(req, GENAPP_CUI_SET_ASIDE, false);
  next();
};
