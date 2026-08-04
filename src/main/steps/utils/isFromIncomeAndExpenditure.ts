import type { Request } from 'express';

/**
 * Checks if the user chose NOT to provide finance details.
 *
 * When shareIncomeExpenseDetails is 'NO', the user skipped the finance journey
 * and went directly from income-and-expenses to other-considerations.
 * The back button from other-considerations should return to income-and-expenses.
 *
 * When 'YES', the user went through the full finance journey, so the back button
 * should return to the last finance step (what-other-regular-expenses-do-you-have).
 */
export const isFromIncomeAndExpenditure = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const shareIncomeExpenseDetails =
    caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances?.shareIncomeExpenseDetails;

  return shareIncomeExpenseDetails === 'NO';
};
