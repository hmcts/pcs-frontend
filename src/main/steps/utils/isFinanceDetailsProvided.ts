import type { Request } from 'express';

/**
 * Checks if the user agreed to provide finance details (income and expenses).
 *
 * Checks the current form submission (req.body) for the provideFinanceDetails field.
 * Returns true if user selected 'yes', false otherwise.
 */
export const isFinanceDetailsProvided = async (req: Request): Promise<boolean> => {
  const provideFinanceDetails = req.body?.provideFinanceDetails;

  return provideFinanceDetails === 'yes';
};
