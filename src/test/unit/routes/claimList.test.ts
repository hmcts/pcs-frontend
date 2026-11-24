import type { Application, NextFunction, Request, RequestHandler, Response } from 'express';

import claimListRoutes, { CLAIM_LIST_ROUTE } from '@routes/claimList';
import { getCitizenClaims, getClaimantClaims } from '@services/pcsApi/pcsApiService';
import { isMakeAClaimEnabled } from '@utils/makeAClaimFlags';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn(),
}));

jest.mock('@modules/i18n', () => ({
  getTranslationFunction: jest.fn(() => (key: string) => key),
}));

jest.mock('@services/pcsApi/pcsApiService', () => ({
  getCitizenClaims: jest.fn(),
  getClaimantClaims: jest.fn(),
}));

jest.mock('@utils/makeAClaimFlags', () => ({
  isMakeAClaimEnabled: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../../main/modules/logger', () => ({
  Logger: { getLogger: jest.fn(() => ({ error: jest.fn() })) },
}));

function buildApp(): Application {
  return {
    get: jest.fn(),
  } as unknown as Application;
}

function getHandler(app: Application): RequestHandler {
  return (app.get as jest.Mock).mock.calls[0][2] as RequestHandler;
}

function buildReq(sessionOverrides: Record<string, unknown> = {}): Request {
  return {
    session: {
      user: { accessToken: 'test-token' },
      ...sessionOverrides,
    },
    i18n: { loadNamespaces: jest.fn().mockResolvedValue(undefined) },
  } as unknown as Request;
}

function buildRes(): Response {
  return {
    redirect: jest.fn(),
    render: jest.fn(),
  } as unknown as Response;
}

describe('claimList route', () => {
  const next: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers GET /claims with oidcMiddleware', () => {
    const app = buildApp();
    claimListRoutes(app);

    expect(app.get).toHaveBeenCalledWith(CLAIM_LIST_ROUTE, expect.anything(), expect.anything());
    expect(CLAIM_LIST_ROUTE).toBe('/claims');
  });

  it('redirects to /login when no access token in session', async () => {
    const app = buildApp();
    claimListRoutes(app);

    const req = buildReq({ user: undefined });
    const res = buildRes();

    await getHandler(app)(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(res.render).not.toHaveBeenCalled();
  });

  it('renders claimList with mapped table rows on successful fetch', async () => {
    (getCitizenClaims as jest.Mock).mockResolvedValue([
      { caseReference: '1234567890123456', claimantName: 'John Doe', propertyPostcode: 'SW1A 1AA' },
      { caseReference: '9876543210987654', claimantName: 'Jane Smith', propertyPostcode: 'EC1A 1BB' },
    ]);

    const app = buildApp();
    claimListRoutes(app);

    const req = buildReq();
    const res = buildRes();

    await getHandler(app)(req, res, next);

    expect(getCitizenClaims).toHaveBeenCalledWith('test-token');
    expect(res.render).toHaveBeenCalledWith(
      'claimList',
      expect.objectContaining({
        tableRows: [
          [
            { text: '1234567890123456' },
            { text: 'John Doe' },
            { text: 'SW1A 1AA' },
            { html: '<a href="/case/1234567890123456/dashboard" class="govuk-link">claimList:table.viewClaim</a>' },
          ],
          [
            { text: '9876543210987654' },
            { text: 'Jane Smith' },
            { text: 'EC1A 1BB' },
            { html: '<a href="/case/9876543210987654/dashboard" class="govuk-link">claimList:table.viewClaim</a>' },
          ],
        ],
      })
    );
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('renders claimList with empty table rows when no claims are returned', async () => {
    (getCitizenClaims as jest.Mock).mockResolvedValue([]);

    const app = buildApp();
    claimListRoutes(app);

    const req = buildReq();
    const res = buildRes();

    await getHandler(app)(req, res, next);

    expect(res.render).toHaveBeenCalledWith('claimList', expect.objectContaining({ tableRows: [] }));
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('filters out claims with no caseReference', async () => {
    (getCitizenClaims as jest.Mock).mockResolvedValue([
      { caseReference: '1234567890123456', claimantName: 'John Doe', propertyPostcode: 'SW1A 1AA' },
      { claimantName: 'No Ref', propertyPostcode: 'EC1A 1BB' },
    ]);

    const app = buildApp();
    claimListRoutes(app);

    const req = buildReq();
    const res = buildRes();

    await getHandler(app)(req, res, next);

    expect(res.render).toHaveBeenCalledWith(
      'claimList',
      expect.objectContaining({
        tableRows: expect.arrayContaining([expect.arrayContaining([{ text: '1234567890123456' }])]),
      })
    );
    const tableRows = (res.render as jest.Mock).mock.calls[0][1].tableRows;
    expect(tableRows).toHaveLength(1);
  });

  it('renders claimList with partial claim data', async () => {
    (getCitizenClaims as jest.Mock).mockResolvedValue([{ caseReference: '1234567890123456' }]);

    const app = buildApp();
    claimListRoutes(app);

    const req = buildReq();
    const res = buildRes();

    await getHandler(app)(req, res, next);

    expect(res.render).toHaveBeenCalledWith(
      'claimList',
      expect.objectContaining({
        tableRows: [
          [
            { text: '1234567890123456' },
            { text: undefined },
            { text: undefined },
            { html: '<a href="/case/1234567890123456/dashboard" class="govuk-link">claimList:table.viewClaim</a>' },
          ],
        ],
      })
    );
  });

  it('propagates error to next when getCitizenClaims throws', async () => {
    const error = new Error('API failure');
    (getCitizenClaims as jest.Mock).mockRejectedValue(error);

    const app = buildApp();
    claimListRoutes(app);

    const req = buildReq();
    const res = buildRes();

    await getHandler(app)(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.render).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  describe('claimant account', () => {
    const CLAIMS_MADE = [
      { caseReference: '2222333344445555', state: 'AWAITING_SUBMISSION_TO_HMCTS' },
      { caseReference: '1111222233334444', state: 'CASE_ISSUED' },
    ];

    beforeEach(() => {
      (isMakeAClaimEnabled as jest.Mock).mockResolvedValue(true);
      (getCitizenClaims as jest.Mock).mockResolvedValue([]);
      (getClaimantClaims as jest.Mock).mockResolvedValue(CLAIMS_MADE);
    });

    async function renderPage(roles: string[] = ['citizen']): Promise<Record<string, unknown>> {
      const app = buildApp();
      claimListRoutes(app);
      const req = buildReq({ user: { accessToken: 'test-token', roles } });
      const res = buildRes();
      await getHandler(app)(req, res, next);
      return (res.render as jest.Mock).mock.calls[0][1];
    }

    it('lists a draft linking to its task list and a submitted claim linking to its dashboard', async () => {
      const view = await renderPage();

      expect(view.claimantAccount).toBe(true);
      expect(getClaimantClaims).toHaveBeenCalledWith('test-token');
      expect(view.claimsMadeRows).toEqual([
        [
          {
            html: '<a href="/case/2222333344445555/make-a-claim/task-list" class="govuk-link">claimList:claimsMade.draftClaim</a>',
          },
          { text: '2222333344445555' },
        ],
        [
          {
            html: '<a href="/case/1111222233334444/claimant-dashboard" class="govuk-link">claimList:claimsMade.submittedClaim</a>',
          },
          { text: '1111222233334444' },
        ],
      ]);
      expect(view.makeAClaimUrl).toBe('/make-a-claim');
    });

    it('still lists the claims made against the citizen', async () => {
      (getCitizenClaims as jest.Mock).mockResolvedValue([
        { caseReference: '9876543210987654', claimantName: 'Jane Smith', propertyPostcode: 'EC1A 1BB' },
      ]);

      const view = await renderPage();

      expect(view.tableRows).toHaveLength(1);
    });

    it.each([['caseworker-pcs-solicitor'], ['caseworker']])(
      'is not shown to the %s role, which is never asked for its claims',
      async role => {
        const view = await renderPage([role]);

        expect(view.claimantAccount).toBe(false);
        expect(getClaimantClaims).not.toHaveBeenCalled();
      }
    );

    it('is not shown while the journey is switched off', async () => {
      (isMakeAClaimEnabled as jest.Mock).mockResolvedValue(false);

      const view = await renderPage();

      expect(view.claimantAccount).toBe(false);
      expect(getClaimantClaims).not.toHaveBeenCalled();
    });

    it('propagates a failure listing the claims made', async () => {
      const error = new Error('API failure');
      (getClaimantClaims as jest.Mock).mockRejectedValue(error);
      const app = buildApp();
      claimListRoutes(app);
      const res = buildRes();

      await getHandler(app)(buildReq(), res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.render).not.toHaveBeenCalled();
    });
  });
});
