import type { Request } from 'express';

/**
 * Checks if the journey came from the income-and-expenditure step.
 *
 * Checks if the shareIncomeExpenseDetails field exists in CCD case data.
 * This field is only set when user completes the income-and-expenditure step.
 * Returns true if field exists, indicating journey came from income-and-expenditure.
 */
export const isFromIncomeAndExpenditure = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const shareIncomeExpenseDetails =
    caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances?.shareIncomeExpenseDetails;

  return shareIncomeExpenseDetails !== undefined;
};
