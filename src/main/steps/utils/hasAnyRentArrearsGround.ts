import type { Request } from 'express';

import { hasAnyRentArrearsInCaseData } from './rentArrearsGroundsFromCaseData';

/**
 * Returns true when ANY selected claim ground is marked as rent arrears
 */
export const hasAnyRentArrearsGround = (req: Request): boolean => {
  return hasAnyRentArrearsInCaseData(req.res?.locals?.validatedCase?.data);
};
