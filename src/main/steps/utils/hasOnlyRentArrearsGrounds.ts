import type { Request } from 'express';

import { hasOnlyRentArrearsInCaseData } from './rentArrearsGroundsFromCaseData';

/**
 * Returns true when ALL selected claim grounds are rent-arrears
 */
export const hasOnlyRentArrearsGrounds = (req: Request): boolean => {
  return hasOnlyRentArrearsInCaseData(req.res?.locals?.validatedCase?.data);
};
