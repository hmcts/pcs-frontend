import type { Request } from 'express';

import type { CcdCaseModel } from '../../../../../main/services/ccdCaseData.model';

/**
 * Build a minimal Express `Request` with `res.locals.validatedCase` populated.
 * This is the shape every respond-to-claim step controller reads from (the merged
 * CCD + draft data produced by the START callback — see CLAUDE.md).
 *
 * Extras layered on:
 *   - `body` — POST body
 *   - `params` — route params (e.g. `caseReference`)
 *   - `query` — query-string params
 *
 * For deeper Express surface (cookies, session, headers), build req inline; this
 * helper deliberately stays narrow so test intent reads cleanly.
 */
export interface RequestStub {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string | string[]>;
}

export function withValidatedCase(validatedCase: CcdCaseModel | undefined, stub: RequestStub = {}): Request {
  return {
    body: stub.body ?? {},
    params: stub.params ?? {},
    query: stub.query ?? {},
    res: { locals: { validatedCase } },
  } as unknown as Request;
}
