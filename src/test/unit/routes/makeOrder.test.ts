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
    draftPayload: { 'hearing-notes': 'Saved note' },
  },
  caseContext: {
    caseReference: 1777027600017760,
    propertyAddress: { addressLine1: '10 Test Street', postTown: 'Bristol', postCode: 'BS1 1AA' },
    claimants: [{ id: 'claimant-id', name: 'Example Housing' }],
    defendants: [{ id: 'defendant-id', name: 'Alex Example' }],
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
        draft: { 'hearing-notes': 'Saved note' },
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('saves posted form data by submitting the makeOrder event', async () => {
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
          draftPayload: { 'hearing-notes': 'Updated note' },
        },
      }),
    });
    expect(res.redirect).toHaveBeenCalledWith('/case/1777027600017760/make-order?saved=true');
  });
});
