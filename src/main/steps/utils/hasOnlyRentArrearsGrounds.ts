import type { Request } from 'express';

import { hasOnlyRentArrearsInCaseData } from './rentArrearsGroundsFromCaseData';

/**
 * Returns true when ALL selected claim grounds are marked as rent arrears.
 */
export const hasOnlyRentArrearsGrounds = async (req: Request): Promise<boolean> => {
  return hasOnlyRentArrearsInCaseData(req.res?.locals?.validatedCase?.data);
};
