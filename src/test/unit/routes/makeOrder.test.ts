import type { Application, NextFunction, Request, Response } from 'express';

import { MAKE_ORDER_ROUTE } from '../../../main/constants/caseRoutes';

import makeOrderRoute from '@routes/makeOrder';
import { ccdCaseService } from '@services/ccdCaseService';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
  judgeAccessMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('@hmcts-cft/cft-ui-component-lib', () => ({
  buildHeaderModel: jest.fn(() => ({ assetsPath: 'default' })),
  buildFooterModel: jest.fn(() => ({ footer: true })),
}));

jest.mock('config', () => ({
  get: jest.fn((key: string) => {
    if (key === 'redirects.manageCaseReturnURL') {
      return 'https://manage-case.example.com/cases/case-details/';
    }
    return '';
  }),
}));

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseByIdForEvent: jest.fn(),
    submitCaseEvent: jest.fn(),
  },
}));

const makeOrderEnvelope = {
  order: {
    id: 'e4414c3c-8de8-40b1-92cb-8b15858406af',
    state: 'DRAFT',
    version: 2,
    draftPayload: {
      version: 1,
      orderType: 'OUTRIGHT_POSSESSION',
      formData: { 'current-rent': '800', 'hearing-notes': 'Saved note' },
      documents: {},
    },
  },
  caseContext: {
    caseReference: 1777027600017760,
    propertyAddress: { addressLine1: '10 Test Street', postTown: 'Bristol', postCode: 'BS1 1AA' },
    claimants: [{ id: 'claimant-id', name: 'Example Housing' }],
    defendants: [{ id: 'defendant-id', name: 'Alex Example' }],
    caseFacts: {
      tenancyStartDate: '2024-01-09',
      tenancyType: 'ASSURED_TENANCY',
      noticeDate: '2025-06-12',
      currentRent: 750,
      rentFrequency: 'MONTHLY',
      groundsPleaded: 'Ground 8, Ground 10',
      arrearsOnIssue: 2400,
    },
  },
};

describe('make order route', () => {
  let app: Application;

  beforeEach(() => {
    app = {
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as Application;
    jest.mocked(ccdCaseService.getCaseByIdForEvent).mockResolvedValue({
      id: '1777027600017760',
      data: { makeOrderPayload: JSON.stringify(makeOrderEnvelope) },
    });
    jest.mocked(ccdCaseService.submitCaseEvent).mockResolvedValue({ id: '1777027600017760', data: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers GET and POST behind OIDC and judge access checks', () => {
    const { judgeAccessMiddleware, oidcMiddleware } = jest.requireMock('../../../main/middleware');
    makeOrderRoute(app);

    expect(app.get).toHaveBeenCalledWith(MAKE_ORDER_ROUTE, oidcMiddleware, judgeAccessMiddleware, expect.any(Function));
    expect(app.post).toHaveBeenCalledWith(
      MAKE_ORDER_ROUTE,
      oidcMiddleware,
      judgeAccessMiddleware,
      expect.any(Function)
    );
  });

  it('loads canonical case data and the saved draft from the makeOrder event', async () => {
    makeOrderRoute(app);
    const handler = (app.get as jest.Mock).mock.calls[0][3] as (
      req: Request,
      res: Response,
      next: NextFunction
    ) => Promise<void>;
    const res = { render: jest.fn() } as unknown as Response;
    const next = jest.fn();

    await handler(
      {
        params: { caseReference: '1777027600017760' },
        query: {},
        session: { user: { accessToken: 'token', roles: ['caseworker-pcs-judge'] } },
      } as unknown as Request,
      res,
      next
    );

    expect(ccdCaseService.getCaseByIdForEvent).toHaveBeenCalledWith('token', '1777027600017760', 'ext:makeOrder');
    expect(res.render).toHaveBeenCalledWith(
      'make-order',
      expect.objectContaining({
        caseReferenceDisplay: '1777-0276-0001-7760',
        propertyAddressDisplay: '10 Test Street, Bristol, BS1 1AA',
        claimantNames: 'Example Housing',
        defendantNames: 'Alex Example',
        draft: {
          'date-tenancy-day': '9',
          'date-tenancy-month': '1',
          'date-tenancy-year': '2024',
          'tenancy-type': 'ASSURED_TENANCY',
          'date-notice-day': '12',
          'date-notice-month': '6',
          'date-notice-year': '2025',
          'current-rent': '800',
          'rent-frequency': 'MONTHLY',
          'grounds-pleaded': 'Ground 8, Ground 10',
          'arrears-issue': '2400',
          'hearing-notes': 'Saved note',
        },
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('creates a draft before rendering when none exists', async () => {
    jest
      .mocked(ccdCaseService.getCaseByIdForEvent)
      .mockResolvedValueOnce({
        id: '1777027600017760',
        data: {
          makeOrderPayload: JSON.stringify({
            ...makeOrderEnvelope,
            order: { ...makeOrderEnvelope.order, id: null, version: 0 },
          }),
        },
      })
      .mockResolvedValueOnce({
        id: '1777027600017760',
        data: { makeOrderPayload: JSON.stringify(makeOrderEnvelope) },
      });
    makeOrderRoute(app);
    const handler = (app.get as jest.Mock).mock.calls[0][3] as (
      req: Request,
      res: Response,
      next: NextFunction
    ) => Promise<void>;
    const res = { render: jest.fn() } as unknown as Response;

    await handler(
      {
        params: { caseReference: '1777027600017760' },
        query: {},
        session: { user: { accessToken: 'token', roles: ['caseworker-pcs-judge'] } },
      } as unknown as Request,
      res,
      jest.fn()
    );

    expect(ccdCaseService.submitCaseEvent).toHaveBeenCalledWith('token', '1777027600017760', 'ext:makeOrder', {
      makeOrderPayload: JSON.stringify({
        action: 'START_DRAFT',
        order: {
          id: null,
          version: 0,
          draftPayload: {
            version: 1,
            orderType: 'OUTRIGHT_POSSESSION',
            formData: {},
            documents: {},
          },
        },
      }),
    });
    expect(ccdCaseService.getCaseByIdForEvent).toHaveBeenCalledTimes(2);
    expect(res.render).toHaveBeenCalledWith('make-order', expect.objectContaining({ order: makeOrderEnvelope.order }));
  });

  it('rejects an XUI launch for a different signed-in user from the main page', async () => {
    makeOrderRoute(app);
    const handler = (app.get as jest.Mock).mock.calls[0][3] as (
      req: Request,
      res: Response,
      next: NextFunction
    ) => Promise<void>;
    const next = jest.fn();

    await handler(
      {
        params: { caseReference: '1777027600017760' },
        query: { expected_sub: 'xui-user' },
        session: { user: { accessToken: 'token', sub: 'different-user', roles: ['caseworker-pcs-judge'] } },
      } as unknown as Request,
      {} as Response,
      next
    );

    expect(ccdCaseService.getCaseByIdForEvent).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it('redirects the XUI event route to the main page and preserves expected_sub', () => {
    makeOrderRoute(app);
    const handler = (app.get as jest.Mock).mock.calls[1][1] as (
      req: Request,
      res: Response,
      next: NextFunction
    ) => void;
    const res = { redirect: jest.fn() } as unknown as Response;

    handler(
      {
        params: { caseReference: '1777027600017760', eventId: 'ext:makeOrder' },
        query: { expected_sub: 'user+id' },
      } as unknown as Request,
      res,
      jest.fn()
    );

    expect(res.redirect).toHaveBeenCalledWith(303, '/case/1777027600017760/make-order?expected_sub=user%2Bid');
    expect(ccdCaseService.getCaseByIdForEvent).not.toHaveBeenCalled();
    expect(ccdCaseService.submitCaseEvent).not.toHaveBeenCalled();
  });

  it('rejects an invalid case reference on the XUI event route', () => {
    makeOrderRoute(app);
    const handler = (app.get as jest.Mock).mock.calls[1][1] as (
      req: Request,
      res: Response,
      next: NextFunction
    ) => void;
    const next = jest.fn();

    handler(
      {
        params: { caseReference: 'not-a-case-reference', eventId: 'ext:makeOrder' },
        query: {},
      } as unknown as Request,
      {} as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });

  it('uses the canonical local URL when starting a draft', async () => {
    makeOrderRoute(app);
    const handler = (app.post as jest.Mock).mock.calls[0][3] as (
      req: Request,
      res: Response,
      next: NextFunction
    ) => Promise<void>;
    const res = { redirect: jest.fn() } as unknown as Response;

    await handler(
      {
        params: { caseReference: '1777027600017760' },
        originalUrl: '//malicious.example',
        session: { user: { accessToken: 'token', roles: ['caseworker-pcs-judge'] } },
        body: { action: 'START_DRAFT' },
      } as unknown as Request,
      res,
      jest.fn()
    );

    expect(res.redirect).toHaveBeenCalledWith(303, '/case/1777027600017760/make-order');
  });

  it('saves posted form data and returns to Manage Case', async () => {
    makeOrderRoute(app);
    const handler = (app.post as jest.Mock).mock.calls[0][3] as (
      req: Request,
      res: Response,
      next: NextFunction
    ) => Promise<void>;
    const res = { redirect: jest.fn() } as unknown as Response;

    await handler(
      {
        params: { caseReference: '1777027600017760' },
        originalUrl: '/case/1777027600017760/make-order',
        session: { user: { accessToken: 'token', roles: ['caseworker-pcs-judge'] } },
        body: {
          _csrf: 'csrf',
          action: 'SAVE_DRAFT',
          orderId: makeOrderEnvelope.order.id,
          orderVersion: '2',
          orderType: 'OUTRIGHT_POSSESSION',
          'hearing-notes': 'Updated note',
        },
      } as unknown as Request,
      res,
      jest.fn()
    );

    expect(ccdCaseService.submitCaseEvent).toHaveBeenCalledWith('token', '1777027600017760', 'ext:makeOrder', {
      makeOrderPayload: JSON.stringify({
        action: 'SAVE_DRAFT',
        order: {
          id: makeOrderEnvelope.order.id,
          version: 2,
          draftPayload: {
            version: 1,
            orderType: 'OUTRIGHT_POSSESSION',
            formData: { 'hearing-notes': 'Updated note' },
            documents: {},
          },
        },
      }),
    });
    expect(res.redirect).toHaveBeenCalledWith('https://manage-case.example.com/cases/case-details/1777027600017760');
  });

  it('submits an outright possession document for review and returns to Manage Case', async () => {
    makeOrderRoute(app);
    const handler = (app.post as jest.Mock).mock.calls[0][3] as (
      req: Request,
      res: Response,
      next: NextFunction
    ) => Promise<void>;
    const res = { redirect: jest.fn() } as unknown as Response;
    const orderDocument = {
      schema: 'docweave-document',
      version: 1,
      current: { type: 'doc', content: [] },
      generated: { type: 'doc', content: [] },
    };

    await handler(
      {
        params: { caseReference: '1777027600017760' },
        originalUrl: '/case/1777027600017760/make-order',
        session: { user: { accessToken: 'token', roles: ['caseworker-pcs-judge'] } },
        body: {
          _csrf: 'csrf',
          action: 'SUBMIT_FOR_REVIEW',
          orderId: makeOrderEnvelope.order.id,
          orderVersion: '2',
          orderType: 'OUTRIGHT_POSSESSION',
          orderDocument: JSON.stringify(orderDocument),
          'hearing-notes': 'Final note',
        },
      } as unknown as Request,
      res,
      jest.fn()
    );

    expect(ccdCaseService.submitCaseEvent).toHaveBeenCalledWith('token', '1777027600017760', 'ext:makeOrder', {
      makeOrderPayload: JSON.stringify({
        action: 'SUBMIT_FOR_REVIEW',
        order: {
          id: makeOrderEnvelope.order.id,
          version: 2,
          draftPayload: {
            version: 1,
            orderType: 'OUTRIGHT_POSSESSION',
            formData: { 'hearing-notes': 'Final note' },
            documents: { OUTRIGHT_POSSESSION: orderDocument },
          },
        },
      }),
    });
    expect(res.redirect).toHaveBeenCalledWith('https://manage-case.example.com/cases/case-details/1777027600017760');
  });
});
