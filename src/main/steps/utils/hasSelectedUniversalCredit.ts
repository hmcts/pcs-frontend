import type { Request } from 'express';

/**
 * Checks if the user selected Universal Credit in regular-income step.
 *
 * Checks if the universalCredit field exists in CCD case data.
 * Returns true if universalCredit was selected, false otherwise.
 */
export const hasSelectedUniversalCredit = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const universalCredit =
    caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances?.universalCredit;

  return universalCredit !== undefined;
};
