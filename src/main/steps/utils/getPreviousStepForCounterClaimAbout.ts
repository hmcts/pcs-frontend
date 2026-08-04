import type { Request } from 'express';

import { hasMultipleParties } from './hasMultipleParties';

import type { YesNoValue } from '@services/ccdCase.interface';

function getNeedHelpWithFees(req: Request): YesNoValue | undefined {
  return req.res?.locals.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim
    ?.needHelpWithFees;
}

export async function getPreviousStepForCounterClaimAbout(req: Request): Promise<string> {
  const needHelpWithFees = getNeedHelpWithFees(req);

  if (needHelpWithFees === 'NO' && (await hasMultipleParties(req))) {
    return 'counter-claim-against-whom';
  }

  return 'counter-claim-fee';
}
