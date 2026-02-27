import type { Request } from 'express';

import { getLaunchDarklyFlag } from '@utils/getLaunchDarklyFlag';

export const isRentArrearsClaim = async (req: Request): Promise<boolean> => {
  return getLaunchDarklyFlag<boolean>(req, 'is-rent-arrears-claim', true);
};
