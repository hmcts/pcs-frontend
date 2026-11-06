import type { NextFunction, Request, Response } from 'express';

import {
  isMakeAClaimPath,
  makeAClaimFeatureMiddleware,
  makeAClaimPathsFeatureMiddleware,
} from '../../../main/middleware/makeAClaimFeature';
import { startStepRegistry } from '../../../main/steps/make-a-claim/start/stepRegistry';
import { stepRegistry } from '../../../main/steps/make-a-claim/stepRegistry';
import { isMakeAClaimEnabled } from '../../../main/utils/makeAClaimFlags';

jest.mock('../../../main/utils/makeAClaimFlags', () => ({
  ...jest.requireActual('../../../main/utils/makeAClaimFlags'),
  isMakeAClaimEnabled: jest.fn(),
}));

const enabled = isMakeAClaimEnabled as jest.Mock;

const CASE = '1777027600017761';

const journeyPaths = [
  ...Object.values(startStepRegistry).map(step => step.url),
  ...Object.values(stepRegistry).map(step => step.url.replace(':caseReference', CASE)),
  `/case/${CASE}/make-a-claim/upload-notice/upload`,
  `/case/${CASE}/make-a-claim/upload-notice/delete`,
  `/case/${CASE}/make-a-claim/upload-notice/document/0`,
  `/case/${CASE}/pay-claim-fee`,
  `/case/${CASE}/pay-claim-fee/start`,
  `/case/${CASE}/claim-submitted`,
];

function run(path: string, roles: string[] = ['citizen']) {
  const req = { path, session: { user: { roles } } } as unknown as Request;
  const res = { status: jest.fn().mockReturnThis(), send: jest.fn() } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('makeAClaimPathsFeatureMiddleware', () => {
  beforeEach(() => enabled.mockReset());

  it('covers every page of the journey', () => {
    expect(journeyPaths.filter(path => !isMakeAClaimPath(path))).toEqual([]);
    expect(journeyPaths.length).toBeGreaterThan(70);
  });

  it.each(journeyPaths)('shows %s as not found while the flag is off', async path => {
    enabled.mockResolvedValue(false);
    const { req, res, next } = run(path);
    await makeAClaimPathsFeatureMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('lets the journey through while the flag is on', async () => {
    enabled.mockResolvedValue(true);
    const { req, res, next } = run(`/case/${CASE}/make-a-claim/task-list`);
    await makeAClaimPathsFeatureMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it.each(['/claims', `/case/${CASE}/respond-to-claim/start-now`, '/make-a-claimx', `/case/${CASE}/dashboard`])(
    'leaves %s alone without asking LaunchDarkly',
    async path => {
      const { req, res, next } = run(path);
      await makeAClaimPathsFeatureMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(enabled).not.toHaveBeenCalled();
    }
  );
});

describe('makeAClaimFeatureMiddleware', () => {
  beforeEach(() => enabled.mockReset().mockResolvedValue(true));

  it.each([
    ['legal representatives', ['caseworker', 'caseworker-pcs-solicitor']],
    ['staff', ['caseworker', 'caseworker-pcs']],
  ])('hides the journey from %s', async (_who, roles) => {
    const { req, res, next } = run('/make-a-claim', roles);
    await makeAClaimFeatureMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('lets a citizen who is a defendant elsewhere through', async () => {
    const { req, res, next } = run('/make-a-claim', ['citizen']);
    await makeAClaimFeatureMiddleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
