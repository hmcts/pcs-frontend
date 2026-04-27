import type { Request } from 'express';

import type { PossessionClaimResponse } from '@services/ccdCase.interface';

/**
 * Check whether the defendant chose to skip equality and diversity questions
 */
export const hasSkippedEqualityAndDiversityQuestions = (req: Request): boolean => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const possessionClaimResponse: PossessionClaimResponse | undefined = caseData?.possessionClaimResponse;
  return possessionClaimResponse?.defendantResponses?.equalityAndDiversityQuestionsChoice === 'SKIP';
};
