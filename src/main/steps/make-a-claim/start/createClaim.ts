import type { Request } from 'express';

import { CallbackRejectedError } from '../../../HttpError';
import { getUserToken } from '../../utils/userRole';
import { flowConfig } from '../flow.config';
import { addressFromBody } from '../formValues';

import { MAKE_A_CLAIM_START_ROUTE } from './flow.config';

import { clearFormData, getAllFormData, setFormData } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import { ccdCaseService } from '@services/ccdCaseService';
import type { LegislativeCountry } from '@services/citizenPossessionClaim.interface';

export const PROPERTY_INELIGIBLE_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-ineligible`;
export const PROPERTY_COUNTRY_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-country`;
export const PROPERTY_NOT_COVERED_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-not-covered`;

const CREATED_CLAIM = 'created-claim';

/** Claims being created, by session, so a double-clicked submission waits for the first rather than making two. */
const creating = new Map<string, Promise<string>>();

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
  return REFUSAL_REDIRECTS.find(([reason]) => error.reasons.includes(reason))?.[1];
}

/**
 * Creates the claim from the answers given before it existed, which pcs-api keeps as the claim's first draft,
 * and gives the page to continue on. Answers that do not make the claimant eligible start them again.
 */
export async function createClaimFromStartAnswers(req: Request): Promise<string> {
  const created = createdCaseReference(req);
  if (created) {
    return getStepUrl('eligible', flowConfig, created);
  }
  const key = req.sessionID ?? req.session?.user?.uid;
  const inFlight = key ? creating.get(key) : undefined;
  if (inFlight) {
    return inFlight;
  }
  const creation = createClaim(req);
  if (!key) {
    return creation;
  }
  creating.set(key, creation);
  try {
    return await creation;
  } finally {
    creating.delete(key);
  }
}

/** The claim this pass through the start questions created, which a repeated submission continues with. */
export function createdCaseReference(req: Request): string | undefined {
  const reference = getAllFormData(req)[CREATED_CLAIM]?.caseReference;
  return typeof reference === 'string' ? reference : undefined;
}

/** Forgets the claim the start questions created, so starting again makes a new one. */
export function forgetCreatedClaim(req: Request): void {
  const answers = getAllFormData(req);
  if (answers[CREATED_CLAIM]) {
    setFormData(req, CREATED_CLAIM, {});
  }
}

async function createClaim(req: Request): Promise<string> {
  const answers = getAllFormData(req);
  const propertyAddress = addressFromBody(answers['property-address'] ?? {}, 'property');
  const legislativeCountry = answers['property-country']?.legislativeCountry as LegislativeCountry | undefined;
  if (
    answers['claimant-type']?.claimantType !== 'PRIVATE_LANDLORD' ||
    answers.trespass?.isTrespass !== 'no' ||
    !propertyAddress?.AddressLine1
  ) {
    return MAKE_A_CLAIM_START_ROUTE;
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
    const caseReference = String(created.id);
    clearFormData(req);
    setFormData(req, CREATED_CLAIM, { caseReference });
    return getStepUrl('eligible', flowConfig, caseReference);
  } catch (error) {
    const redirect = refusedClaimRedirect(error);
    if (redirect) {
      return redirect;
    }
    throw error;
  }
}
