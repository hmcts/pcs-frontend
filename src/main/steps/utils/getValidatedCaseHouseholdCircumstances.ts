import type { Request } from 'express';

import type { HouseholdCircumstances } from '../../services/ccdCase.interface';

export function getValidatedCaseHouseholdCircumstances(req: Request): HouseholdCircumstances | undefined {
  const caseData = req.res?.locals?.validatedCase?.data as
    | {
        possessionClaimResponse?: {
          defendantResponses?: { householdCircumstances?: HouseholdCircumstances };
        };
      }
    | undefined;

  return caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;
}
