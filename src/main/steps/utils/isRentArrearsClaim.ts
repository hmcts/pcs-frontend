import type { Request } from 'express';

import { hasAnyRentArrearsInCaseData } from './rentArrearsGroundsFromCaseData';

/**
 * Checks if the claim includes rent arrears from CCD case data
 */
export const isRentArrearsClaim = async (req: Request): Promise<boolean> => {
  return hasAnyRentArrearsInCaseData(req.res?.locals?.validatedCase?.data);
};
