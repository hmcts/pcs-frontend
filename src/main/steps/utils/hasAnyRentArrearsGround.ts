import type { Request } from 'express';

import { hasAnyRentArrearsInCaseData } from './rentArrearsGroundsFromCaseData';

/**
 * Returns true when ANY selected claim ground is marked as rent arrears.
 */
export const hasAnyRentArrearsGround = async (req: Request): Promise<boolean> => {
  return hasAnyRentArrearsInCaseData(req.res?.locals?.validatedCase?.data);
};
