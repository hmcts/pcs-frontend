import type { PossessionClaimResponse } from '@services/ccdCase.interface';

/**
 * A normaliser removes fields that are no longer reachable in the current journey state.
 * Normalisers mutate a working copy in place; `normaliseRespondToClaimDraft` owns the
 * cloning so the input is never modified.
 *
 * When to add a normaliser:
 *   1. A step is conditionally skipped based on a defendant's answer (mutable trigger).
 *   2. The skipped step's data lives in `defendantResponses.*`.
 *   3. If the user goes back and changes their answer, the skipped step's data becomes stale.
 *   Rule: delete the stale downstream field when its trigger condition is no longer met.
 *
 * When NOT to add a normaliser:
 *   - The routing gate is claimant data (e.g. hasTenancyStartDate) — it never changes, so
 *     no stale data can accumulate.
 *   - The stale field is in `defendantContactDetails.party.*` — see constraint below.
 *
 * IMPORTANT: only operate on `defendantResponses.*`. Fields under
 * `defendantContactDetails.party.*` are defendant-entered contact details written to
 * PartyEntity on final submission — deleting them in a normaliser silently prevents them
 * reaching the entity. If you need to clear a `party.*` field, do it in the owning step's
 * `beforeRedirect`, not here.
 *
 * The `normaliserContract.test.ts` regression test enforces this: any normaliser that
 * touches `defendantContactDetails` will fail the build.
 */
export type Normaliser = (response: PossessionClaimResponse) => void;
