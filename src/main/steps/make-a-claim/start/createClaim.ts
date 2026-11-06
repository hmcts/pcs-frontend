import type { Request } from 'express';

import { CallbackRejectedError } from '../../../HttpError';
import { PROPERTY_INELIGIBLE_URL } from '../../../constants/makeAClaimRoutes';
import { getUserToken } from '../../utils/userRole';
import { flowConfig } from '../flow.config';
import { addressFromBody } from '../formValues';

import { MAKE_A_CLAIM_START_ROUTE } from './flow.config';

import { clearFormData, getAllFormData } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import { ccdCaseService } from '@services/ccdCaseService';
import type { LegislativeCountry } from '@services/citizenPossessionClaim.interface';

export { PROPERTY_INELIGIBLE_URL };
export const PROPERTY_COUNTRY_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-country`;
export const PROPERTY_NOT_COVERED_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-not-covered`;
export const PROPERTY_ADDRESS_TOO_LONG_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-address?problem=tooLong`;

/** How long a claim creation holds its lock, and how long a repeated submission waits for it. */
const CREATION_LOCK_MS = 15_000;
const CREATED_CLAIM_TTL_SECONDS = 60 * 60;
const WAIT_INTERVAL_MS = 200;

/** The part of the Redis client the creation guard uses. */
export interface CreationGuardStore {
  set(key: string, value: string, ...options: (string | number)[]): Promise<string | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
}

function guardStoreOf(req: Request): CreationGuardStore | undefined {
  return req.app?.locals?.redisClient as CreationGuardStore | undefined;
}

const lockKey = (sessionId: string) => `make-a-claim:creating:${sessionId}`;
const createdKey = (sessionId: string) => `make-a-claim:created:${sessionId}`;

const eligibleUrl = (caseReference: string) => getStepUrl('eligible', flowConfig, caseReference);

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
 *
 * A double-clicked submission can reach two pods at once, so the guard lives in Redis beside the sessions: one
 * request takes a short lock and creates the claim, and the claim it created is kept outside the session, where
 * a stale session save cannot undo it. A repeated submission waits for that claim and continues with it.
 */
export async function createClaimFromStartAnswers(req: Request): Promise<string> {
  const store = guardStoreOf(req);
  const sessionId = req.sessionID;
  if (!store || !sessionId) {
    return (await createClaim(req)).next;
  }
  const created = await store.get(createdKey(sessionId));
  if (created) {
    return eligibleUrl(created);
  }
  if ((await store.set(lockKey(sessionId), '1', 'PX', CREATION_LOCK_MS, 'NX')) !== 'OK') {
    return waitForCreatedClaim(store, sessionId);
  }
  try {
    const { next, caseReference } = await createClaim(req);
    if (caseReference) {
      await store.set(createdKey(sessionId), caseReference, 'EX', CREATED_CLAIM_TTL_SECONDS);
    }
    return next;
  } finally {
    await store.del(lockKey(sessionId));
  }
}

async function waitForCreatedClaim(store: CreationGuardStore, sessionId: string): Promise<string> {
  for (let waited = 0; waited < CREATION_LOCK_MS; waited += WAIT_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, WAIT_INTERVAL_MS));
    const created = await store.get(createdKey(sessionId));
    if (created) {
      return eligibleUrl(created);
    }
    if (!(await store.get(lockKey(sessionId)))) {
      break;
    }
  }
  return `${MAKE_A_CLAIM_START_ROUTE}/who-is-claiming`;
}

/** The claim this pass through the start questions created, which a repeated submission continues with. */
export async function createdCaseReference(req: Request): Promise<string | undefined> {
  const store = guardStoreOf(req);
  return (store && req.sessionID ? await store.get(createdKey(req.sessionID)) : null) ?? undefined;
}

/** Forgets the claim the start questions created, so starting again makes a new one. */
export async function forgetCreatedClaim(req: Request): Promise<void> {
  const store = guardStoreOf(req);
  if (store && req.sessionID) {
    await store.del(createdKey(req.sessionID));
  }
}

async function createClaim(req: Request): Promise<{ next: string; caseReference?: string }> {
  const answers = getAllFormData(req);
  const propertyAddress = addressFromBody(answers['property-address'] ?? {}, 'property');
  const legislativeCountry = answers['property-country']?.legislativeCountry as LegislativeCountry | undefined;
  if (
    answers['claimant-type']?.claimantType !== 'PRIVATE_LANDLORD' ||
    answers.trespass?.isTrespass !== 'no' ||
    !propertyAddress?.AddressLine1
  ) {
    return { next: MAKE_A_CLAIM_START_ROUTE };
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
    return { next: eligibleUrl(caseReference), caseReference };
  } catch (error) {
    const redirect = refusedClaimRedirect(error);
    if (redirect) {
      return { next: redirect };
    }
    throw error;
  }
}
