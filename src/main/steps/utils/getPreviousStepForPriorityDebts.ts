import type { Request } from 'express';

import { getValidatedCaseHouseholdCircumstances } from './getValidatedCaseHouseholdCircumstances';
import { hasSelectedUniversalCredit } from './hasSelectedUniversalCredit';
import { fromYesNoEnum } from './yesNoEnum';

export const getPreviousStepForPriorityDebts = async (
  req: Request,
  _formData?: Record<string, unknown>
): Promise<string> => {
  const householdCircumstances = getValidatedCaseHouseholdCircumstances(req);
  const receivesUcAsIncome = fromYesNoEnum(householdCircumstances?.universalCredit);

  if (receivesUcAsIncome === 'yes') {
    return 'what-regular-income-do-you-receive';
  }

  const appliedForUc = fromYesNoEnum(householdCircumstances?.hasAppliedForUniversalCredit);
  if (appliedForUc === 'yes' || appliedForUc === 'no') {
    return 'have-you-applied-for-universal-credit';
  }

  const selectedUniversalCredit = await hasSelectedUniversalCredit(req);
  if (selectedUniversalCredit) {
    return 'what-regular-income-do-you-receive';
  }

  // Default fallback (shouldn't normally reach here)
  return 'have-you-applied-for-universal-credit';
};
