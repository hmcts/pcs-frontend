import type { Request } from 'express';

import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';

export const isWelshProperty = async (req: Request): Promise<boolean> => {
  return getLaunchDarklyFlag<boolean>(req, 'is-welsh-property', false);
};
