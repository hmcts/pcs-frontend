import type { Request } from 'express';

import { hasAnyRentArrearsInCaseData } from './rentArrearsGroundsFromCaseData';

/**
 * Checks if the claim includes rent arrears from CCD case data.
 *
 * Checks claimGroundSummaries array from CCD case data.
 * Returns true if ANY claim ground has isRentArrears: "Yes" (case-insensitive), false otherwise.
 */
export const isRentArrearsClaim = async (req: Request): Promise<boolean> => {
  return hasAnyRentArrearsInCaseData(req.res?.locals?.validatedCase?.data);
};
