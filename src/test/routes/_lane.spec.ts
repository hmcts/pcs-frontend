/**
 * Smoke test for the routes test lane.
 *
 * This file exists so `yarn test:routes` finds at least one matching spec while
 * the lane is empty — `jest.routes.config.ts` roots at `src/test/routes`, and
 * Jest exits non-zero if no tests are found.
 *
 * Delete (or move) this file once the first real route spec lands under
 * `src/test/routes/respondToClaim/` per the test-refactor plan
 * (`docs/respond-to-claim-test-refactor-plan.md`, Phase 1).
 */
describe('routes test lane', () => {
  it('is wired and discoverable by jest.routes.config.ts', () => {
    expect(true).toBe(true);
  });
});
