import type { Request } from 'express';

import { getValidatedCaseHouseholdCircumstances } from './getValidatedCaseHouseholdCircumstances';
import { isRegularIncomeUcUnticked } from './respondToClaimCaseOverrides';
import { fromYesNoEnum } from './yesNoEnum';

export const hasSelectedUniversalCredit = async (req: Request): Promise<boolean> => {
  if (isRegularIncomeUcUnticked(req)) {
    return false;
  }

  const universalCredit = getValidatedCaseHouseholdCircumstances(req)?.universalCredit;

  return fromYesNoEnum(universalCredit) === 'yes';
};
