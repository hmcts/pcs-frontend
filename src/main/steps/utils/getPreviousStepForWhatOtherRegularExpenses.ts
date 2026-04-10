import type { Request } from 'express';

import { fromYesNoEnum } from './yesNoEnum';

export const getPreviousStepForWhatOtherRegularExpenses = async (req: Request): Promise<string> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const priorityDebts = caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances?.priorityDebts;

  return fromYesNoEnum(priorityDebts) === 'yes' ? 'priority-debt-details' : 'priority-debts';
};
