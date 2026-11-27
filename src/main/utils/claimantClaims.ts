import type { Request } from 'express';

import { AWAITING_SUBMISSION } from '../steps/make-a-claim/submittedClaim';
import { isLegalRepresentativeUser, isStaffUser } from '../steps/utils/userRole';

import { Logger } from '@modules/logger';
import type { ClaimantClaimSummary } from '@services/ccdCase.interface';
import { getClaimantClaims } from '@services/pcsApi/pcsApiService';
import { isMakeAClaimEnabled } from '@utils/makeAClaimFlags';

const logger = Logger.getLogger('claimantClaims');

export function isDraftClaim(claim: ClaimantClaimSummary): boolean {
  return claim.state === AWAITING_SUBMISSION;
}

export function formatClaimantPropertyAddress(address: ClaimantClaimSummary['propertyAddress']): string | undefined {
  if (!address) {
    return undefined;
  }
  return [
    address.addressLine1,
    address.addressLine2,
    address.addressLine3,
    address.postTown,
    address.county,
    address.postcode,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * The claim the signed-in citizen created as claimant, or undefined when the case is not one of theirs. pcs-api
 * lists only cases the citizen created and CCD still shows them, so this is also the claimant gate.
 */
export async function findClaimantClaim(
  accessToken: string,
  caseReference: string
): Promise<ClaimantClaimSummary | undefined> {
  const claims = await getClaimantClaims(accessToken);
  return claims.find(claim => claim.caseReference === caseReference);
}

/**
 * Whether the signed-in user is the claimant of this case, for pages the claimant and the defendant share. It
 * answers false rather than failing, so such a page falls back to its defendant behaviour.
 */
export async function isClaimantOfCase(req: Request, caseReference: string): Promise<boolean> {
  const accessToken = req.session?.user?.accessToken;
  if (!accessToken || isLegalRepresentativeUser(req) || isStaffUser(req)) {
    return false;
  }
  try {
    return (await isMakeAClaimEnabled(req)) && Boolean(await findClaimantClaim(accessToken, caseReference));
  } catch (error) {
    logger.warn('Could not tell whether the user is the claimant of the case', error);
    return false;
  }
}
