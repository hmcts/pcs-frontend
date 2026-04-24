import type { Request } from 'express';

import { getValidatedCaseHouseholdCircumstances } from './getValidatedCaseHouseholdCircumstances';
import { hasSelectedUniversalCredit } from './hasSelectedUniversalCredit';
import { fromYesNoEnum } from './yesNoEnum';

export const getPreviousStepForPriorityDebts = async (
  req: Request,
  _formData?: Record<string, unknown>
): Promise<string> => {
  const selectedUniversalCredit = await hasSelectedUniversalCredit(req);
  if (selectedUniversalCredit) {
    return 'what-regular-income-do-you-receive';
  }

  const householdCircumstances = getValidatedCaseHouseholdCircumstances(req);
  const ucApplicationDate = householdCircumstances?.ucApplicationDate;
  const appliedForUc = fromYesNoEnum(householdCircumstances?.universalCredit);
  if (ucApplicationDate) {
    return 'have-you-applied-for-universal-credit';
  }
  if (appliedForUc === 'no') {
    return 'have-you-applied-for-universal-credit';
  }

  return 'have-you-applied-for-universal-credit';
};
