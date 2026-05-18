import type { NextFunction, Request, Response } from 'express';

jest.mock('@services/sectionStatus', () => ({
  ...jest.requireActual('@services/sectionStatus'),
  getAllSectionStatuses: jest.fn(),
  getFirstVisibleStep: jest.fn(),
  safeIsAnswered: jest.fn(),
}));

jest.mock('../../../../main/steps/index', () => {
  const actual = jest.requireActual('../../../../main/steps/index');
  return {
    ...actual,
    shouldShowStep: jest.fn(),
  };
});

jest.mock('../../../../main/steps/utils', () => ({
  ...jest.requireActual('../../../../main/steps/utils'),
  getUserType: jest.fn(),
}));

import { shouldShowStep } from '../../../../main/steps/index';
import { respondToClaimAccessGuard } from '../../../../main/steps/respond-to-claim/accessGuard';
import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';
import { getUserType } from '../../../../main/steps/utils';

import { getAllSectionStatuses, getFirstVisibleStep, safeIsAnswered } from '@services/sectionStatus';

const mockGetUserType = getUserType as jest.MockedFunction<typeof getUserType>;
const mockShouldShowStep = shouldShowStep as jest.MockedFunction<typeof shouldShowStep>;
const mockGetAllSectionStatuses = getAllSectionStatuses as jest.MockedFunction<typeof getAllSectionStatuses>;
const mockGetFirstVisibleStep = getFirstVisibleStep as jest.MockedFunction<typeof getFirstVisibleStep>;
const mockSafeIsAnswered = safeIsAnswered as jest.MockedFunction<typeof safeIsAnswered>;

interface MakeReqArgs {
  path?: string;
  method?: string;
  caseId?: string | undefined;
}

const makeReq = ({
  path = '/case/123/respond-to-claim/landlord-registered',
  method = 'GET',
  caseId = '123',
}: MakeReqArgs = {}): Request =>
  ({
    path,
    method,
    res: { locals: { validatedCase: caseId === undefined ? undefined : { id: caseId } } },
  }) as unknown as Request;

const makeRes = (): Response =>
  ({
    redirect: jest.fn(),
  }) as unknown as Response;

describe('respondToClaimAccessGuard', () => {
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
    mockGetUserType.mockReturnValue('citizen');
    mockShouldShowStep.mockReturnValue(true);
    mockGetAllSectionStatuses.mockResolvedValue(new Map([['disputeAndTenancy', 'AVAILABLE']]));
    mockGetFirstVisibleStep.mockReturnValue(undefined);
    mockSafeIsAnswered.mockReturnValue(false);
  });

  it('passes through POST requests regardless of state', async () => {
    const req = makeReq({ method: 'POST' });
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('passes through legalrep requests regardless of state', async () => {
    mockGetUserType.mockReturnValue('legalrep');
    const req = makeReq();
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('passes through the hub URL itself', async () => {
    const req = makeReq({ path: `/case/123/respond-to-claim/${flowConfig.hubStepName}` });
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('passes through a non-section step (end-now)', async () => {
    const req = makeReq({ path: '/case/123/respond-to-claim/end-now' });
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('passes through when caseId is missing', async () => {
    const req = makeReq({ caseId: undefined });
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('passes through a section step in an AVAILABLE section', async () => {
    const req = makeReq();
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('redirects to hub when the section is NOT_AVAILABLE_YET', async () => {
    mockGetAllSectionStatuses.mockResolvedValue(new Map([['disputeAndTenancy', 'NOT_AVAILABLE_YET']]));
    const req = makeReq();
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith(303, '/case/123/respond-to-claim/task-list');
    expect(next).not.toHaveBeenCalled();
  });

  it('redirects to hub when the section is NOT_APPLICABLE', async () => {
    mockGetAllSectionStatuses.mockResolvedValue(new Map([['disputeAndTenancy', 'NOT_APPLICABLE']]));
    const req = makeReq();
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith(303, '/case/123/respond-to-claim/task-list');
    expect(next).not.toHaveBeenCalled();
  });

  it('redirects to hub when the step showCondition is false', async () => {
    mockShouldShowStep.mockReturnValue(false);
    const req = makeReq();
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith(303, '/case/123/respond-to-claim/task-list');
    expect(next).not.toHaveBeenCalled();
  });

  it('redirects CYA without answers to the first VISIBLE step (not section.steps[0])', async () => {
    mockGetAllSectionStatuses.mockResolvedValue(new Map([['disputeAndTenancy', 'AVAILABLE']]));
    mockSafeIsAnswered.mockReturnValue(false);
    mockGetFirstVisibleStep.mockReturnValue('landlord-registered');
    const req = makeReq({ path: '/case/123/respond-to-claim/check-your-answers-your-response' });
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith(303, '/case/123/respond-to-claim/landlord-registered');
    expect(next).not.toHaveBeenCalled();
  });

  it('passes through CYA when at least one step in the section is answered', async () => {
    mockGetAllSectionStatuses.mockResolvedValue(new Map([['disputeAndTenancy', 'IN_PROGRESS']]));
    mockSafeIsAnswered.mockReturnValue(true);
    const req = makeReq({ path: '/case/123/respond-to-claim/check-your-answers-your-response' });
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('fails closed to hub when a predicate throws', async () => {
    mockGetAllSectionStatuses.mockRejectedValue(new Error('predicate exploded'));
    const req = makeReq();
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith(303, '/case/123/respond-to-claim/task-list');
    expect(next).not.toHaveBeenCalled();
  });

  it('builds the hub URL from flowConfig.hubStepName, not a string literal', async () => {
    mockGetAllSectionStatuses.mockResolvedValue(new Map([['disputeAndTenancy', 'NOT_AVAILABLE_YET']]));
    const req = makeReq();
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith(303, expect.stringContaining(`/${flowConfig.hubStepName}`));
  });
});
