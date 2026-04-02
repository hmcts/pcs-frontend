import type { Request } from 'express';

export const getPreviousStepForWhatOtherRegularExpenses = async (req: Request): Promise<string> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const priorityDebts = caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances?.priorityDebts;

  return priorityDebts === 'YES' ? 'priority-debt-details' : 'priority-debts';
};
