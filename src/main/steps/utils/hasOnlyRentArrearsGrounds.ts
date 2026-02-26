import type { Request } from 'express';

export const hasOnlyRentArrearsGrounds = (req: Request): boolean => {
  const caseData = req.res?.locals.validatedCase?.data;
  const claimDueToRentArrears = caseData?.claimDueToRentArrears;
  const hasOtherAdditionalGrounds = caseData?.hasOtherAdditionalGrounds;
  
  return claimDueToRentArrears === 'Yes' && hasOtherAdditionalGrounds !== 'Yes';
};