import type { Request } from 'express';

/**
 * Checks if the user selected Universal Credit in their regular income sources.
 *
 * Checks the current form submission (req.body) for the regularIncome field.
 * Returns true if 'universalCredit' is included in the selected income sources, false otherwise.
 */
export const isUniversalCreditSelected = async (req: Request): Promise<boolean> => {
  const regularIncome = req.body?.regularIncome;

  return [regularIncome].flat().filter(Boolean).includes('universalCredit');
};
