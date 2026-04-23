import type { Request } from 'express';

import { getValidatedCaseHouseholdCircumstances } from './getValidatedCaseHouseholdCircumstances';
import { hasSelectedUniversalCredit } from './hasSelectedUniversalCredit';
import { fromYesNoEnum } from './yesNoEnum';

export const getPreviousStepForPriorityDebts = async (
  req: Request,
  _formData?: Record<string, unknown>
): Promise<string> => {
  const householdCircumstances = getValidatedCaseHouseholdCircumstances(req);
  const ucApplicationDate = householdCircumstances?.ucApplicationDate;
  const appliedForUc = fromYesNoEnum(householdCircumstances?.universalCredit);
  if (ucApplicationDate) {
    return 'have-you-applied-for-universal-credit';
  }
  if (appliedForUc === 'no') {
    return 'have-you-applied-for-universal-credit';
  }

  const selectedUniversalCredit = await hasSelectedUniversalCredit(req);
  return selectedUniversalCredit ? 'what-regular-income-do-you-receive' : 'have-you-applied-for-universal-credit';
};
