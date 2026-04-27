import type { PossessionClaimResponse } from '@services/ccdCase.interface';

/**
 * A normaliser removes fields that are no longer reachable in the current journey state.
 * Normalisers mutate a working copy in place; the orchestrator owns the cloning so the
 * public boundary stays pure.
 *
 * IMPORTANT: only operate on `defendantResponses.*`. Fields under
 * `defendantContactDetails.party.*` are rebuilt from PartyEntity by the BE on every START
 * callback — dropping them in a normaliser appears to work locally but the next page reload
 * will re-populate them from the entity. If you need to clear a `party.*` field, do it in
 * the owning step's `beforeRedirect` (same-page DELETE), not here.
 *
 * The `normaliserContract.test.ts` regression test enforces this: any normaliser that
 * touches `defendantContactDetails` will fail the build.
 */
export type Normaliser = (response: PossessionClaimResponse) => void;
