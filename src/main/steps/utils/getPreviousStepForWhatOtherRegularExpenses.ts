import type { Request } from 'express';

import { getValidatedCaseHouseholdCircumstances } from './getValidatedCaseHouseholdCircumstances';
import { fromYesNoEnum } from './yesNoEnum';

export const getPreviousStepForWhatOtherRegularExpenses = async (req: Request): Promise<string> => {
  const priorityDebts = getValidatedCaseHouseholdCircumstances(req)?.priorityDebts;

  return fromYesNoEnum(priorityDebts) === 'yes' ? 'priority-debt-details' : 'priority-debts';
};
