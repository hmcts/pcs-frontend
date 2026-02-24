import type { Request } from 'express';

import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';

//TODO need to add logic to check if defendant name is known from CCD case data
export const isDefendantNameKnown = async (req: Request): Promise<boolean> => {
  // If the flag does not exist LD will return the default (true) so UI remains visible by default.
  const result = await getLaunchDarklyFlag<string>(req, 'defendant-name', '');
  req.session.defendantName = result;

  return result !== '';
};
