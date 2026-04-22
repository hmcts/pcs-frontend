import type { Request } from 'express';

import { fromYesNoEnum } from './yesNoEnum';

export const hasSelectedUniversalCredit = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const universalCredit =
    caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances?.universalCredit;

  return fromYesNoEnum(universalCredit) === 'yes';
};
