import type { Request } from 'express';

import { hasMultipleParties } from './hasMultipleParties';

import type { VerticalYesNoValue } from '@services/ccdCase.interface';

function getNeedHelpWithFees(req: Request): VerticalYesNoValue | undefined {
  return req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim
    ?.needHelpWithFees;
}

export async function getPreviousStepForCounterClaimAbout(req: Request): Promise<string> {
  const needHelpWithFees = getNeedHelpWithFees(req);

  if (needHelpWithFees === 'NO' && (await hasMultipleParties(req))) {
    return 'counter-claim-against-who';
  }

  return 'counter-claim-fee';
}
