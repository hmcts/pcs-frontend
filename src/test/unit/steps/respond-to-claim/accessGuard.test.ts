import type { NextFunction, Request, Response } from 'express';

jest.mock('@services/sectionStatus', () => ({
  ...jest.requireActual('@services/sectionStatus'),
  getAllSectionStatuses: jest.fn(),
  getFirstVisibleStep: jest.fn(),
  safeIsAnswered: jest.fn(),
}));

jest.mock('@steps', () => ({
  ...jest.requireActual('@steps'),
  shouldShowStep: jest.fn(),
}));

jest.mock('../../../../main/steps/utils', () => ({
  ...jest.requireActual('../../../../main/steps/utils'),
  getUserType: jest.fn(),
}));

import { respondToClaimAccessGuard } from '../../../../main/steps/respond-to-claim/accessGuard';
import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';
import { getUserType } from '../../../../main/steps/utils';

import { getAllSectionStatuses, getFirstVisibleStep, safeIsAnswered } from '@services/sectionStatus';
import { shouldShowStep } from '@steps';

const mockGetUserType = getUserType as jest.MockedFunction<typeof getUserType>;
const mockShouldShowStep = shouldShowStep as jest.MockedFunction<typeof shouldShowStep>;
const mockGetAllSectionStatuses = getAllSectionStatuses as jest.MockedFunction<typeof getAllSectionStatuses>;
const mockGetFirstVisibleStep = getFirstVisibleStep as jest.MockedFunction<typeof getFirstVisibleStep>;
const mockSafeIsAnswered = safeIsAnswered as jest.MockedFunction<typeof safeIsAnswered>;

interface MakeReqArgs {
  path?: string;
  method?: string;
  caseId?: string | undefined;
  query?: Record<string, string>;
}

const makeReq = ({
  path = '/case/123/respond-to-claim/landlord-registered',
  method = 'GET',
  caseId = '123',
  query = {},
}: MakeReqArgs = {}): Request =>
  ({
    path,
    method,
    query,
    session: {},
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

  it('redirects a directly-accessed CYA to the first visible step', async () => {
    mockGetAllSectionStatuses.mockResolvedValue(new Map([['disputeAndTenancy', 'IN_PROGRESS']]));
    mockSafeIsAnswered.mockReturnValue(true);
    mockGetFirstVisibleStep.mockReturnValue('landlord-registered');
    const req = makeReq({ path: '/case/123/respond-to-claim/check-your-answers-your-response' });
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith(303, '/case/123/respond-to-claim/landlord-registered');
    expect(next).not.toHaveBeenCalled();
  });

  it('passes through a CYA reached via internal navigation (?nav=1)', async () => {
    mockGetAllSectionStatuses.mockResolvedValue(new Map([['disputeAndTenancy', 'IN_PROGRESS']]));
    mockSafeIsAnswered.mockReturnValue(true);
    mockGetFirstVisibleStep.mockReturnValue('landlord-registered');
    const req = makeReq({
      path: '/case/123/respond-to-claim/check-your-answers-your-response',
      query: { nav: '1' },
    });
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('redirects a directly-accessed mid-section step to the first visible step', async () => {
    mockGetFirstVisibleStep.mockReturnValue('dispute-claim-interstitial');
    const req = makeReq({ path: '/case/123/respond-to-claim/landlord-registered' });
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith(303, '/case/123/respond-to-claim/dispute-claim-interstitial');
    expect(next).not.toHaveBeenCalled();
  });

  it('passes through a section first visible step accessed directly', async () => {
    mockGetFirstVisibleStep.mockReturnValue('landlord-registered');
    const req = makeReq({ path: '/case/123/respond-to-claim/landlord-registered' });
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('passes through a mid-section step reached via internal navigation (?nav=1)', async () => {
    mockGetFirstVisibleStep.mockReturnValue('dispute-claim-interstitial');
    const req = makeReq({ path: '/case/123/respond-to-claim/landlord-registered', query: { nav: '1' } });
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('passes through a mid-section step reached via a CYA change link (?edit)', async () => {
    mockGetFirstVisibleStep.mockReturnValue('dispute-claim-interstitial');
    const req = makeReq({
      path: '/case/123/respond-to-claim/landlord-registered',
      query: { edit: 'disputeAndTenancy' },
    });
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('passes through a CYA reached via the language toggle (?lang=cy)', async () => {
    mockGetAllSectionStatuses.mockResolvedValue(new Map([['disputeAndTenancy', 'IN_PROGRESS']]));
    mockSafeIsAnswered.mockReturnValue(true);
    mockGetFirstVisibleStep.mockReturnValue('landlord-registered');
    const req = makeReq({
      path: '/case/123/respond-to-claim/check-your-answers-your-response',
      query: { lang: 'cy' },
    });
    const res = makeRes();
    await respondToClaimAccessGuard()(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('passes through a mid-section step reached via the language toggle (?lang=cy)', async () => {
    mockGetFirstVisibleStep.mockReturnValue('dispute-claim-interstitial');
    const req = makeReq({
      path: '/case/123/respond-to-claim/landlord-registered',
      query: { lang: 'cy' },
    });
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
