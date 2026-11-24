import type { Application, NextFunction, Request, RequestHandler, Response } from 'express';

import claimantDashboardRoutes from '@routes/claimantDashboard';
import { ccdCaseService } from '@services/ccdCaseService';
import { findClaimantClaim } from '@utils/claimantClaims';

jest.mock('../../../main/middleware/oidc', () => ({ oidcMiddleware: jest.fn() }));
jest.mock('@modules/i18n', () => ({ getTranslationFunction: jest.fn(() => (key: string) => key) }));
jest.mock('@services/ccdCaseService', () => ({ ccdCaseService: { getCaseById: jest.fn() } }));
jest.mock('@utils/claimantClaims', () => ({
  ...jest.requireActual('@utils/claimantClaims'),
  findClaimantClaim: jest.fn(),
}));

const CASE = '1234567890123456';
const ADDRESS = { addressLine1: '15 Garden Drive', postTown: 'Luton', postcode: 'LU1 1AB' };

function handler(): RequestHandler {
  const app = { get: jest.fn() } as unknown as Application;
  claimantDashboardRoutes(app);
  return (app.get as jest.Mock).mock.calls[0][2] as RequestHandler;
}

function req(accessToken: string | null = 'token'): Request {
  return {
    params: { caseReference: CASE },
    session: { user: accessToken ? { accessToken } : undefined },
    i18n: { loadNamespaces: jest.fn().mockResolvedValue(undefined) },
  } as unknown as Request;
}

function res(): Response {
  return { render: jest.fn(), redirect: jest.fn() } as unknown as Response;
}

describe('claimantDashboard route', () => {
  const next: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
      data: { citizenPossessionClaim: { submission: { paymentStatus: 'NOT_PAID' } } },
    });
  });

  it('registers the claimant dashboard path', () => {
    const app = { get: jest.fn() } as unknown as Application;
    claimantDashboardRoutes(app);
    expect(app.get).toHaveBeenCalledWith(
      '/case/:caseReference/claimant-dashboard',
      expect.anything(),
      expect.anything()
    );
  });

  it('is unauthorised without an access token', async () => {
    await handler()(req(null), res(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('is not found when the case is not one the citizen created', async () => {
    (findClaimantClaim as jest.Mock).mockResolvedValue(undefined);
    const response = res();

    await handler()(req(), response, next);

    expect(findClaimantClaim).toHaveBeenCalledWith('token', CASE);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
    expect(response.render).not.toHaveBeenCalled();
    expect(ccdCaseService.getCaseById).not.toHaveBeenCalled();
  });

  it('sends a draft claim to its task list', async () => {
    (findClaimantClaim as jest.Mock).mockResolvedValue({ caseReference: CASE, state: 'AWAITING_SUBMISSION_TO_HMCTS' });
    const response = res();

    await handler()(req(), response, next);

    expect(response.redirect).toHaveBeenCalledWith(303, `/case/${CASE}/make-a-claim/task-list`);
    expect(response.render).not.toHaveBeenCalled();
  });

  it('renders the address, case number and links to the claim form and documents, without a general application before the fee is paid', async () => {
    (findClaimantClaim as jest.Mock).mockResolvedValue({
      caseReference: CASE,
      state: 'PENDING_CASE_ISSUED',
      propertyAddress: ADDRESS,
    });
    const response = res();

    await handler()(req(), response, next);

    const view = (response.render as jest.Mock).mock.calls[0];
    expect(view[0]).toBe('claimant-dashboard');
    expect(view[1]).toEqual(
      expect.objectContaining({
        propertyAddress: '15 Garden Drive, Luton, LU1 1AB',
        caseNumber: '1234 5678 9012 3456',
        claimMade: true,
      })
    );
    const tasks = view[1].taskGroups.flatMap((group: { tasks: unknown[] }) => group.tasks);
    expect(tasks).toEqual([
      expect.objectContaining({
        title: { text: 'claimantDashboard:tasks.viewClaimForm' },
        href: `/case/${CASE}/view-documents`,
      }),
      expect.objectContaining({
        title: { text: 'claimantDashboard:tasks.viewDocuments' },
        href: `/case/${CASE}/view-documents`,
      }),
    ]);
  });

  it('adds the general application once the fee is paid', async () => {
    (findClaimantClaim as jest.Mock).mockResolvedValue({ caseReference: CASE, state: 'CASE_ISSUED' });
    (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
      data: { citizenPossessionClaim: { submission: { paymentStatus: 'PAID' } } },
    });
    const response = res();

    await handler()(req(), response, next);

    const groups = (response.render as jest.Mock).mock.calls[0][1].taskGroups;
    expect(groups.map((group: { groupId: string }) => group.groupId)).toEqual(['claim', 'documents', 'applications']);
    expect(groups[2].tasks[0].href).toBe(`/case/${CASE}/make-an-application/choose-an-application`);
  });

  it('shows no claim panel for a state the court has moved past', async () => {
    (findClaimantClaim as jest.Mock).mockResolvedValue({ caseReference: CASE, state: 'HEARING_READINESS' });
    const response = res();

    await handler()(req(), response, next);

    expect((response.render as jest.Mock).mock.calls[0][1].claimMade).toBe(false);
  });

  it('passes a failure to next', async () => {
    const error = new Error('pcs-api down');
    (findClaimantClaim as jest.Mock).mockRejectedValue(error);

    await handler()(req(), res(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
