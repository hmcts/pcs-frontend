import type { Request } from 'express';

import type { CcdCaseData } from '@services/ccdCase.interface';

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
export function isWalesProperty(req: Request): boolean;
export function isWalesProperty(caseData: CcdCaseData | Record<string, unknown> | undefined): boolean;
export function isWalesProperty(
  reqOrCaseData: Request | CcdCaseData | Record<string, unknown> | undefined
): boolean {
  const caseData =
    reqOrCaseData && 'res' in reqOrCaseData
      ? (reqOrCaseData as Request).res?.locals?.validatedCase?.data
      : reqOrCaseData;
  const legislativeCountry = (caseData as Record<string, unknown> | undefined)?.legislativeCountry;

  // Case-insensitive comparison to handle any case variations
  return (legislativeCountry as string | undefined)?.toUpperCase() === 'WALES';
}
