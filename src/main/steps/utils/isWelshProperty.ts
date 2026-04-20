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
export const isWelshProperty = (req: Request): boolean => {
  const { legislativeCountry } = req.res?.locals?.validatedCase ?? { legislativeCountry: '' };

  // Case-insensitive comparison to handle any case variations
  return legislativeCountry?.toUpperCase() === 'WALES';
};
