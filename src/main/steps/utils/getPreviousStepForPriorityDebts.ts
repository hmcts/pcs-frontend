import type { Request } from 'express';

import { getValidatedCaseHouseholdCircumstances } from './getValidatedCaseHouseholdCircumstances';
import { hasSelectedUniversalCredit } from './hasSelectedUniversalCredit';

export const getPreviousStepForPriorityDebts = async (
  req: Request,
  _formData?: Record<string, unknown>
): Promise<string> => {
  const ucApplicationDate = getValidatedCaseHouseholdCircumstances(req)?.ucApplicationDate;
  if (ucApplicationDate) {
    return 'have-you-applied-for-universal-credit';
  }

  const selectedUniversalCredit = await hasSelectedUniversalCredit(req);
  return selectedUniversalCredit ? 'what-regular-income-do-you-receive' : 'have-you-applied-for-universal-credit';
};
