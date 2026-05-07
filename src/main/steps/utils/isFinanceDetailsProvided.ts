import type { Request } from 'express';

import { normalizeYesNoValue } from './normalizeYesNoValue';

/**
 * Checks if the user agreed to provide finance details (income and expenses).
 *
 * Prefer the current form submission when present, then falls back to CCD-backed case data.
 */
export const isFinanceDetailsProvided = (req: Request): boolean => {
  const provideFinanceDetails = req.body?.provideFinanceDetails;
  if (provideFinanceDetails === 'yes') {
    return true;
  }
  if (provideFinanceDetails === 'no') {
    return false;
  }

  const ccdAnswer =
    req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.householdCircumstances
      ?.shareIncomeExpenseDetails;

  return normalizeYesNoValue(ccdAnswer) === 'YES';
};
