import { createHash, randomUUID } from 'crypto';

import type { Request } from 'express';

import { CallbackRejectedError } from '../../../HttpError';
import { PROPERTY_INELIGIBLE_URL } from '../../../constants/makeAClaimRoutes';
import { getUserToken } from '../../utils/userRole';
import { flowConfig } from '../flow.config';
import { addressFromBody } from '../formValues';
import { AWAITING_SUBMISSION, caseStateOf } from '../submittedClaim';

import { MAKE_A_CLAIM_START_ROUTE } from './flow.config';

import { getAllFormData, setFormData } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import { ccdCaseService } from '@services/ccdCaseService';
import type { LegislativeCountry } from '@services/citizenPossessionClaim.interface';

export { PROPERTY_INELIGIBLE_URL };
export const PROPERTY_COUNTRY_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-country`;
export const PROPERTY_NOT_COVERED_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-not-covered`;
export const PROPERTY_ADDRESS_TOO_LONG_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-address?problem=tooLong`;

/** How long a claim creation holds its lock, and how long a repeated submission waits for it. */
const CREATION_LOCK_MS = 15_000;
const WAIT_INTERVAL_MS = 200;
/** How long what came of a set of answers is remembered, so going back and submitting them again reuses it. */
const OUTCOME_TTL_SECONDS = 60 * 60;

/** The pre-case answers that name this pass through the start questions, renewed each time the start page is shown. */
const START_ATTEMPT = 'start-attempt';

/** Deletes the lock only if it still holds this request's token, so a lock that expired and was retaken survives. */
const RELEASE_OWN_LOCK =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

/** The part of the Redis client the creation guard uses. */
export interface CreationGuardStore {
  set(key: string, value: string, ...options: (string | number)[]): Promise<string | null>;
  get(key: string): Promise<string | null>;
  eval(script: string, numberOfKeys: number, ...args: string[]): Promise<unknown>;
}

/** What a creation for a set of answers came to: the claim made, or where its refusal sent the claimant. */
interface CreationOutcome {
  caseReference?: string;
  redirect?: string;
}

function guardStoreOf(req: Request): CreationGuardStore | undefined {
  return req.app?.locals?.redisClient as CreationGuardStore | undefined;
}

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
 * The answers a claim is created from, as a key: the same answers in the same session and pass through the start
 * questions make the same claim, and different ones (another property, say) or a new pass make a new claim.
 */
function answersKey(req: Request): string {
  const answers = getAllFormData(req);
  const digest = createHash('sha256')
    .update(
      JSON.stringify([
        answers['claimant-type']?.claimantType,
        answers.trespass?.isTrespass,
        addressFromBody(answers['property-address'] ?? {}, 'property'),
        answers['property-country']?.legislativeCountry,
      ])
    )
    .digest('hex');
  return `${req.sessionID}:${answers[START_ATTEMPT]?.id ?? ''}:${digest}`;
}

function outcomeUrl(outcome: CreationOutcome): string | undefined {
  return outcome.caseReference ? eligibleUrl(outcome.caseReference) : outcome.redirect;
}

/**
 * Creates the claim from the answers given before it existed, which pcs-api keeps as the claim's first draft,
 * and gives the page to continue on. Answers that do not make the claimant eligible start them again.
 *
 * A double-clicked submission can reach two pods at once, so the guard lives in Redis beside the sessions. One
 * request takes a short lock, with a token only it can release, and creates the claim. What came of it (the claim,
 * or the page a refusal sends the claimant to) is kept against the answers, outside the session where a stale
 * session save cannot undo it, and a repeat of the same answers gets the same outcome.
 */
export async function createClaimFromStartAnswers(req: Request): Promise<string> {
  const store = guardStoreOf(req);
  if (!store || !req.sessionID) {
    return (await createClaim(req)).next;
  }
  const key = answersKey(req);
  const outcomeKey = `make-a-claim:created:${key}`;
  const lockKey = `make-a-claim:creating:${key}`;
  const recorded = await readOutcome(store, outcomeKey);
  const recordedUrl = recorded && outcomeUrl(recorded);
  if (recorded && recordedUrl && (await stillReusable(req, recorded))) {
    return recordedUrl;
  }
  const token = randomUUID();
  if ((await store.set(lockKey, token, 'PX', CREATION_LOCK_MS, 'NX')) !== 'OK') {
    return waitForOutcome(store, outcomeKey, lockKey);
  }
  try {
    const { next, caseReference } = await createClaim(req);
    const outcome: CreationOutcome = caseReference ? { caseReference } : { redirect: next };
    await store.set(outcomeKey, JSON.stringify(outcome), 'EX', OUTCOME_TTL_SECONDS);
    return next;
  } finally {
    await store.eval(RELEASE_OWN_LOCK, 1, lockKey, token);
  }
}

async function readOutcome(store: CreationGuardStore, outcomeKey: string): Promise<CreationOutcome | undefined> {
  const recorded = await store.get(outcomeKey);
  return recorded ? (JSON.parse(recorded) as CreationOutcome) : undefined;
}

/**
 * A repeat reuses the claim made for the same answers unless it is known to have been submitted since; a claim whose
 * state cannot be read is reused rather than risk a second one. A refusal always replays.
 */
async function stillReusable(req: Request, outcome: CreationOutcome): Promise<boolean> {
  if (!outcome.caseReference) {
    return true;
  }
  const state = await caseStateOf(getUserToken(req), outcome.caseReference);
  return state === undefined || state === AWAITING_SUBMISSION;
}

/** Forgets what came of earlier passes through the start questions, so starting again makes a new claim. */
export function startNewAttempt(req: Request): void {
  setFormData(req, START_ATTEMPT, { id: randomUUID() });
}

async function waitForOutcome(store: CreationGuardStore, outcomeKey: string, lockKey: string): Promise<string> {
  for (let waited = 0; waited < CREATION_LOCK_MS; waited += WAIT_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, WAIT_INTERVAL_MS));
    const outcome = await readOutcome(store, outcomeKey);
    const url = outcome && outcomeUrl(outcome);
    if (url) {
      return url;
    }
    if (!(await store.get(lockKey))) {
      break;
    }
  }
  return `${MAKE_A_CLAIM_START_ROUTE}/who-is-claiming`;
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
    return { next: eligibleUrl(caseReference), caseReference };
  } catch (error) {
    const redirect = refusedClaimRedirect(error);
    if (redirect) {
      return { next: redirect };
    }
    throw error;
  }
}
