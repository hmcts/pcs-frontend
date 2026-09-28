import { formatAddress } from '@utils/ccdDashboardUtils';
import type { Request } from 'express';

export const getCaseTitleData = (req: Request): Record<string, unknown> => {

  return {
    propertyAddress: formatAddress(req.res?.locals.validatedCase?.data?.propertyAddress)
  };

};
