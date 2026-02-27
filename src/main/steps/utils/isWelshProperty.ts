import type { Request } from 'express';

/**
 * Checks if property is located in Wales from CCD case data.
 *
 * Uses legislativeCountry field from CCD case data.
 *
 * Real data shows title case values:
 * - England cases: "England"
 * - Wales cases: "Wales"
 *
 * NOT uppercase "ENGLAND"/"WALES" as might be expected.
 */
export const isWelshProperty = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const legislativeCountry = caseData?.legislativeCountry;

  // Case-insensitive comparison to handle any case variations
  return legislativeCountry?.toUpperCase() === 'WALES';
};
