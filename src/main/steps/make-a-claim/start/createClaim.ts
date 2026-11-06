import { createHash, randomUUID } from 'crypto';

import type { Request } from 'express';

import { CallbackRejectedError, HTTPError } from '../../../HttpError';
import { PROPERTY_INELIGIBLE_URL } from '../../../constants/makeAClaimRoutes';
import { getUserToken } from '../../utils/userRole';
import { flowConfig } from '../flow.config';
import { addressFromBody } from '../formValues';
import { AWAITING_SUBMISSION, caseStateOf } from '../submittedClaim';

import { MAKE_A_CLAIM_START_ROUTE } from './flow.config';

import { getAllFormData, setFormData } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import { CREATE_POSSESSION_CLAIM_TIMEOUT_MS, ccdCaseService } from '@services/ccdCaseService';
import type { LegislativeCountry } from '@services/citizenPossessionClaim.interface';

export { PROPERTY_INELIGIBLE_URL };
export const PROPERTY_COUNTRY_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-country`;
export const PROPERTY_NOT_COVERED_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-not-covered`;
const WHO_IS_CLAIMING_URL = `${MAKE_A_CLAIM_START_ROUTE}/who-is-claiming`;
export const PROPERTY_ADDRESS_TOO_LONG_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-address?problem=tooLong`;

/** How long a claim creation holds its lock: well beyond both of the create event's calls reaching their timeout. */
const CREATION_LOCK_MS = 3 * CREATE_POSSESSION_CLAIM_TIMEOUT_MS;
const WAIT_INTERVAL_MS = 200;
/** How long what came of a set of answers is remembered, so going back and submitting them again reuses it. */
const OUTCOME_TTL_SECONDS = 60 * 60;
/** How long a failed creation is replayed to the requests that waited for it. */
const FAILURE_TTL_SECONDS = 60;

/** The pre-case answers that name this pass through the start questions, renewed each time the start page is shown. */
const START_ATTEMPT = 'start-attempt';

/** Deletes a key only if it still holds the value given, so a lock or outcome another request has replaced survives. */
const DELETE_IF_UNCHANGED =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

/** The part of the Redis client the creation guard uses. */
export interface CreationGuardStore {
  set(key: string, value: string, ...options: (string | number)[]): Promise<string | null>;
  get(key: string): Promise<string | null>;
  eval(script: string, numberOfKeys: number, ...args: string[]): Promise<unknown>;
}

/**
 * What a creation for a set of answers came to: the claim made, where its refusal sent the claimant, or the error it
 * failed with. It carries the token of the lock it was made under, so a waiting request takes only its own.
 */
interface CreationOutcome {
  token?: string;
  caseReference?: string;
  redirect?: string;
  failed?: { message: string; status: number; retryAfter?: string };
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
 * request takes a lock, with a token only it can release, and creates the claim. What came of it (the claim, the
 * page a refusal sends the claimant to, or the error it failed with) is kept against the answers under that token,
 * outside the session where a stale session save cannot undo it. Requests that found the lock taken wait for that
 * token's outcome; a later repeat of the same answers reuses the claim while it is still a draft.
 */
export async function createClaimFromStartAnswers(req: Request, attempts = 3): Promise<string> {
  const store = guardStoreOf(req);
  if (!store || !req.sessionID) {
    return (await createClaim(req)).next;
  }
  const key = answersKey(req);
  const outcomeKey = `make-a-claim:created:${key}`;
  const lockKey = `make-a-claim:creating:${key}`;
  const recorded = await store.get(outcomeKey);
  const reused = await reusableUrl(req, recorded);
  if (reused) {
    return reused;
  }
  if (recorded) {
    await store.eval(DELETE_IF_UNCHANGED, 1, outcomeKey, recorded);
  }
  const token = randomUUID();
  if ((await store.set(lockKey, token, 'PX', CREATION_LOCK_MS, 'NX')) !== 'OK') {
    const holder = await store.get(lockKey);
    if (holder) {
      return waitForOutcome(store, outcomeKey, lockKey, holder);
    }
    return attempts > 1 ? createClaimFromStartAnswers(req, attempts - 1) : WHO_IS_CLAIMING_URL;
  }
  try {
    const madeMeanwhile = await reusableUrl(req, await store.get(outcomeKey));
    if (madeMeanwhile) {
      return madeMeanwhile;
    }
    const { next, caseReference } = await createRecordingFailure(req, store, outcomeKey, token);
    const outcome: CreationOutcome = caseReference ? { token, caseReference } : { token, redirect: next };
    await store.set(outcomeKey, JSON.stringify(outcome), 'EX', OUTCOME_TTL_SECONDS);
    return next;
  } finally {
    await store.eval(DELETE_IF_UNCHANGED, 1, lockKey, token);
  }
}

/** Creates the claim, leaving any error it fails with for the requests waiting on this one to fail with too. */
async function createRecordingFailure(
  req: Request,
  store: CreationGuardStore,
  outcomeKey: string,
  token: string
): Promise<{ next: string; caseReference?: string }> {
  try {
    return await createClaim(req);
  } catch (error) {
    const failed = {
      message: error instanceof Error ? error.message : 'Internal server error',
      status: error instanceof HTTPError ? error.status : 500,
      retryAfter: error instanceof HTTPError ? error.retryAfter : undefined,
    };
    await store.set(outcomeKey, JSON.stringify({ token, failed }), 'EX', FAILURE_TTL_SECONDS);
    throw error;
  }
}

function parseOutcome(recorded: string | null): CreationOutcome | undefined {
  return recorded ? (JSON.parse(recorded) as CreationOutcome) : undefined;
}

/** Where a recorded outcome sends a repeat of its answers, or undefined when it must not be reused. */
async function reusableUrl(req: Request, recorded: string | null): Promise<string | undefined> {
  const outcome = parseOutcome(recorded);
  const url = outcome && outcomeUrl(outcome);
  return outcome && url && (await stillReusable(req, outcome)) ? url : undefined;
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

/** What the creation this request waited for came to, failing with its error if it failed. */
function replay(outcome: CreationOutcome): string {
  if (outcome.failed) {
    throw new HTTPError(outcome.failed.message, outcome.failed.status, outcome.failed.retryAfter);
  }
  return outcomeUrl(outcome) ?? WHO_IS_CLAIMING_URL;
}

/** Waits, for as long as the lock is held by the same creation, for the outcome that creation records. */
async function waitForOutcome(
  store: CreationGuardStore,
  outcomeKey: string,
  lockKey: string,
  holder: string
): Promise<string> {
  for (;;) {
    await new Promise(resolve => setTimeout(resolve, WAIT_INTERVAL_MS));
    const outcome = parseOutcome(await store.get(outcomeKey));
    if (outcome?.token === holder) {
      return replay(outcome);
    }
    if ((await store.get(lockKey)) !== holder) {
      const last = parseOutcome(await store.get(outcomeKey));
      return last?.token === holder ? replay(last) : WHO_IS_CLAIMING_URL;
    }
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
    return { next: eligibleUrl(caseReference), caseReference };
  } catch (error) {
    const redirect = refusedClaimRedirect(error);
    if (redirect) {
      return { next: redirect };
    }
    throw error;
  }
}
