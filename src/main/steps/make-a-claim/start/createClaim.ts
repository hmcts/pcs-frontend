import type { Request } from 'express';

import { CallbackRejectedError } from '../../../HttpError';
import { PROPERTY_INELIGIBLE_URL } from '../../../constants/makeAClaimRoutes';
import { getUserToken } from '../../utils/userRole';
import { flowConfig, taskListPath } from '../flow.config';
import { addressFromBody } from '../formValues';
import { AWAITING_SUBMISSION } from '../submittedClaim';

import { MAKE_A_CLAIM_START_ROUTE } from './flow.config';

import { Logger } from '@modules/logger';
import { getAllFormData } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import { ccdCaseService } from '@services/ccdCaseService';
import type { LegislativeCountry } from '@services/citizenPossessionClaim.interface';

export { PROPERTY_INELIGIBLE_URL };
export const PROPERTY_COUNTRY_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-country`;
export const PROPERTY_NOT_COVERED_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-not-covered`;
export const WHO_IS_CLAIMING_URL = `${MAKE_A_CLAIM_START_ROUTE}/who-is-claiming`;
export const PROPERTY_ADDRESS_TOO_LONG_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-address?problem=tooLong`;

const logger = Logger.getLogger('makeAClaimCreateClaim');

const eligibleUrl = (caseReference: string) => getStepUrl('eligible', flowConfig, caseReference);

/** The claimant's own claim not yet submitted, to carry on with instead of starting another. */
async function existingDraftClaim(req: Request): Promise<string | undefined> {
  try {
    const [caseReference] = await ccdCaseService.searchOwnCasesInState(getUserToken(req), AWAITING_SUBMISSION);
    return caseReference;
  } catch (error) {
    logger.warn('Could not search for an existing draft claim; creating a new one', {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

/** Where pcs-api's reasons for refusing to create the claim send the claimant. */
const REFUSAL_REDIRECTS: [reason: string, redirect: string][] = [
  ['PROPERTY_NOT_IN_ENGLAND', PROPERTY_INELIGIBLE_URL],
  ['LEGISLATIVE_COUNTRY_REQUIRED', PROPERTY_COUNTRY_URL],
  ['POSTCODE_NOT_ASSIGNED_TO_COURT', PROPERTY_NOT_COVERED_URL],
  ['PROPERTY_NOT_ELIGIBLE', PROPERTY_NOT_COVERED_URL],
];

/** Where to send a claimant whose claim pcs-api refused to create, or undefined when the refusal is unexpected. */
export function refusedClaimRedirect(error: unknown): string | undefined {
  if (!(error instanceof CallbackRejectedError)) {
    return undefined;
  }
  if (error.reasons.some(reason => reason.startsWith('TOO_LONG:propertyAddress'))) {
    return PROPERTY_ADDRESS_TOO_LONG_URL;
  }
  return REFUSAL_REDIRECTS.find(([reason]) => error.reasons.includes(reason))?.[1];
}

/**
 * Creates the claim from the answers given before it existed, which pcs-api keeps as the claim's first draft,
 * and gives the page to continue on. Answers that do not make the claimant eligible start them again.
 */
export async function createClaimFromStartAnswers(req: Request): Promise<string> {
  const answers = getAllFormData(req);
  const propertyAddress = addressFromBody(answers['property-address'] ?? {}, 'property');
  const legislativeCountry = answers['property-country']?.legislativeCountry as LegislativeCountry | undefined;
  if (
    answers['claimant-type']?.claimantType !== 'PRIVATE_LANDLORD' ||
    answers.trespass?.isTrespass !== 'no' ||
    answers['who-is-claiming']?.whoIsClaiming !== 'MYSELF' ||
    !propertyAddress?.AddressLine1
  ) {
    return MAKE_A_CLAIM_START_ROUTE;
  }

  const existing = await existingDraftClaim(req);
  if (existing) {
    return taskListPath(existing);
  }

  try {
    const created = await ccdCaseService.createPossessionClaim(getUserToken(req), {
      citizenPossessionClaim: {
        propertyAddress,
        eligibility: {
          claimantType: 'PRIVATE_LANDLORD',
          isTrespass: 'NO',
          whoIsClaiming: 'MYSELF',
          ...(legislativeCountry === 'England' ? { legislativeCountry } : {}),
        },
      },
    });
    return eligibleUrl(String(created.id));
  } catch (error) {
    const redirect = refusedClaimRedirect(error);
    if (redirect) {
      return redirect;
    }
    throw error;
  }
}
