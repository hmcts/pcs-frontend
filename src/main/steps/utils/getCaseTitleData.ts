import type { Request } from 'express';

import { formatAddress } from '@utils/ccdDashboardUtils';

export const getCaseTitleData = (req: Request): Record<string, unknown> => {
  return {
    propertyAddress: formatAddress(req.res?.locals.validatedCase?.data?.propertyAddress),
  };
};
