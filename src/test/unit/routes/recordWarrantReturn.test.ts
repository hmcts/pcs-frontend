jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    startCaseEvent: jest.fn().mockReturnValue({
      data: {
        claimantType: {
          value: {
            label: 'Claimant Type',
          },
        },
        allDefendants: [],
      },
    }),
  },
}));

import { Application } from 'express';

import recordWarrantReturnRoutes from '@routes/recordWarrantReturn';
import { ccdCaseService } from '@services/ccdCaseService';
import {
  EvictionOutcome,
  EvictionSuccessfulReturnName,
  EvictionUnsuccessfulReturnName,
  InterimReturnName,
  WarrantReturnType,
} from '@utils/warrantReturn';

type RouteHandler = (req: Request, res: Response, next: jest.Mock) => Promise<void> | void;

describe('recordWarrantReturnRoutes', () => {
  let app: Application;

  const getHandler = (path: string): RouteHandler => {
    const call = (app.get as jest.Mock).mock.calls.find(([routePath]) => routePath === path);

    if (!call) {
      throw new Error(`No handler registered for ${path}`);
    }

    return call[2] as RouteHandler;
  };

  const postHandler = (path: string): RouteHandler => {
    const call = (app.post as jest.Mock).mock.calls.find(([routePath]) => routePath === path);

    if (!call) {
      throw new Error(`No handler registered for ${path}`);
    }

    return call[2] as RouteHandler;
  };

  beforeEach(() => {
    app = {
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as Application;

    recordWarrantReturnRoutes(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Route registration', () => {
    it('registers warrant return GET route', () => {
      expect(app.get).toHaveBeenCalledWith(
        '/case/:caseReference/record-warrant-return',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('registers warrant return POST route', () => {
      expect(app.post).toHaveBeenCalledWith(
        '/case/:caseReference/record-warrant-return',
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('GET warrantReturn', () => {
    const mockStartCaseEvent = ccdCaseService.startCaseEvent as jest.Mock;

    it('renders the warrant return page', async () => {
      const handler = getHandler('/case/:caseReference/record-warrant-return');

      const res = {
        render: jest.fn(),
      };

      await handler(
        {
          params: {
            caseReference: '123',
          },
          session: {
            user: {
              accessToken: 'token',
            },
          },
        } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );

      expect(mockStartCaseEvent).toHaveBeenCalled();
      expect(res.render).toHaveBeenCalledWith(
        'record-warrant-return/warrant-return',
        expect.objectContaining({
          evictionData: expect.any(Object),
        })
      );
    });
  });

  describe('GET checkYourAnswers', () => {
    it('shows the case heading as Confirm order review does', async () => {
      (ccdCaseService.startCaseEvent as jest.Mock).mockReturnValueOnce({
        data: {
          propertyAddress: { AddressLine1: '1 High Street', PostTown: 'London', PostCode: 'SW1A 1AA' },
          allClaimants: [{ value: { orgName: 'Housing Ltd' } }],
          allDefendants: [{ value: { nameKnown: 'YES', firstName: 'Sam', lastName: 'Smith' } }],
        },
      });
      const res = { render: jest.fn() };

      await getHandler('/case/:caseReference/record-warrant-return/check-your-answers')(
        {
          params: { caseReference: '1794231546115667' },
          originalUrl: '/case/1794231546115667/record-warrant-return/check-your-answers',
          session: { user: { accessToken: 'token' } },
        } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );

      expect(res.render).toHaveBeenCalledWith(
        'record-warrant-return/check-your-answers',
        expect.objectContaining({
          caseReferenceDisplay: '1794-2315-4611-5667',
          propertyAddressDisplay: '1 High Street, London, SW1A 1AA',
          claimantNames: 'Housing Ltd',
          defendantNames: 'Sam Smith',
        })
      );
    });
  });

  describe('POST warrantReturn', () => {
    const path = '/case/:caseReference/record-warrant-return';

    const evictionDate = { day: '1', month: '3', year: '2026', hour: '14', minute: '05' };
    const evictionDateFields = (parts: Record<string, string> = evictionDate) =>
      Object.fromEntries(Object.entries(parts).map(([part, value]) => [`eviction-date-${part}`, value]));

    const post = async (body: Record<string, unknown>, session: Record<string, unknown> = {}) => {
      const res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
        redirect: jest.fn(),
      };
      const req = {
        params: { caseReference: '123' },
        originalUrl: '/case/123/record-warrant-return',
        body,
        session: {
          warrantReturn: undefined as Record<string, unknown> | undefined,
          user: { accessToken: 'token' },
          save: jest.fn((callback: (error?: Error) => void) => callback()),
          ...session,
        },
      };
      const next = jest.fn();
      await postHandler(path)(req as unknown as Request, res as unknown as Response, next);
      return { req, res, next };
    };

    const errorIds = (res: { render: jest.Mock }): string[] =>
      Object.keys(res.render.mock.calls[0][1].validationErrors);

    it('renders validation errors when no return type is supplied', async () => {
      const { res } = await post({});

      expect(res.status).toHaveBeenCalledWith(400);
      expect(errorIds(res)).toEqual(['return-type']);
      expect(res.render).toHaveBeenCalledWith(
        'record-warrant-return/warrant-return',
        expect.objectContaining({ evictionData: expect.any(Object), caseReferenceDisplay: '123' })
      );
    });

    it('requires a final outcome for a final return', async () => {
      const { res } = await post({ 'return-type': WarrantReturnType.FINAL });

      expect(errorIds(res)).toEqual(['final-outcome']);
    });

    it('saves a successful eviction to the session and redirects to check your answers', async () => {
      const { req, res } = await post({
        'return-type': WarrantReturnType.FINAL,
        'final-outcome': EvictionOutcome.SUCCESSFUL,
        'eviction-successful-return-name': EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
        'additional-details': 'Keys handed to claimant',
        ...evictionDateFields(),
      });

      expect(req.session.warrantReturn).toEqual({
        '123': {
          returnType: WarrantReturnType.FINAL,
          outcome: EvictionOutcome.SUCCESSFUL,
          returnName: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
          evictionDate: '2026-03-01T14:05:00.000+00:00',
          additionalDetails: 'Keys handed to claimant',
        },
      });
      expect(req.session.save).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/case/123/record-warrant-return/check-your-answers');
    });

    it('keeps the answers and shows errors for a successful eviction with nothing filled in', async () => {
      const { res, req } = await post({
        'return-type': WarrantReturnType.FINAL,
        'final-outcome': EvictionOutcome.SUCCESSFUL,
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(errorIds(res)).toEqual(['eviction-successful-return-name', 'eviction-date-day', 'additional-details']);
      expect(res.render.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          evictionDateError: 'Eviction date and time is required',
          answers: expect.objectContaining({ returnType: 'FINAL', finalOutcome: 'SUCCESSFUL' }),
        })
      );
      expect(req.session.warrantReturn).toBeUndefined();
    });

    it.each([
      [
        { ...evictionDate, month: '', minute: '' },
        'eviction-date-month',
        'The data entered is not valid for Eviction date and time',
      ],
      [{ ...evictionDate, day: 'x' }, 'eviction-date-day', 'The data entered is not valid for Eviction date and time'],
      [
        { ...evictionDate, year: '26' },
        'eviction-date-year',
        'The data entered is not valid for Eviction date and time',
      ],
      [
        { ...evictionDate, day: '30', month: '2' },
        'eviction-date-day',
        'The data entered is not valid for Eviction date and time',
      ],
      [
        { ...evictionDate, hour: '24' },
        'eviction-date-day',
        'The data entered is not valid for Eviction date and time',
      ],
      [
        { ...evictionDate, minute: '60' },
        'eviction-date-day',
        'The data entered is not valid for Eviction date and time',
      ],
      [
        { ...evictionDate, day: '29', month: '3', hour: '1', minute: '30' },
        'eviction-date-day',
        'The data entered is not valid for Eviction date and time',
      ],
      [{ ...evictionDate, year: '2999' }, 'eviction-date-day', 'Eviction date and time must be in the past'],
    ])('rejects eviction date %o', async (parts, id, message) => {
      const { res } = await post({
        'return-type': WarrantReturnType.FINAL,
        'final-outcome': EvictionOutcome.SUCCESSFUL,
        'eviction-successful-return-name': EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
        'additional-details': 'Details',
        ...evictionDateFields(parts),
      });

      expect(res.render.mock.calls[0][1].validationErrors).toEqual({ [id]: { text: message } });
      expect(res.render.mock.calls[0][1].evictionDateError).toBe(message);
    });

    it('requires additional details for an unsuccessful return name that needs them', async () => {
      const { res } = await post({
        'return-type': WarrantReturnType.FINAL,
        'final-outcome': EvictionOutcome.UNSUCCESSFUL,
        'eviction-unsuccessful-return-name': EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
        'additional-details': '   ',
      });

      expect(errorIds(res)).toEqual(['additional-details']);
    });

    it('saves a cancelled eviction without an eviction date', async () => {
      const { req, res } = await post({
        'return-type': WarrantReturnType.FINAL,
        'final-outcome': EvictionOutcome.CANCELLED,
        'eviction-unsuccessful-return-name': EvictionUnsuccessfulReturnName.WARRANT_EXPIRED,
        ...evictionDateFields(),
      });

      expect(req.session.warrantReturn).toEqual({
        '123': {
          returnType: WarrantReturnType.FINAL,
          outcome: EvictionOutcome.CANCELLED,
          returnName: EvictionUnsuccessfulReturnName.WARRANT_EXPIRED,
          additionalDetails: undefined,
        },
      });
      expect(res.redirect).toHaveBeenCalled();
    });

    it('rejects a return name that is not one of the options', async () => {
      const { res } = await post({
        'return-type': WarrantReturnType.INTERIM,
        'interim-return-name': 'NOT_A_RETURN_NAME',
      });

      expect(errorIds(res)).toEqual(['interim-return-name']);
    });

    it('rejects additional details over the maximum length', async () => {
      const { res } = await post({
        'return-type': WarrantReturnType.INTERIM,
        'interim-return-name': InterimReturnName.CROWDS_OR_PROTESTS,
        'additional-details': 'a'.repeat(6801),
      });

      expect(res.render.mock.calls[0][1].validationErrors).toEqual({
        'additional-details': { text: 'Additional details must be 6,800 characters or fewer' },
      });
    });

    it('saves an interim return and keeps the answers of other cases', async () => {
      const otherCase = { returnType: WarrantReturnType.INTERIM, returnName: InterimReturnName.CROWDS_OR_PROTESTS };
      const { req } = await post(
        {
          'return-type': WarrantReturnType.INTERIM,
          'interim-return-name': InterimReturnName.REOPEN_WARRANT,
          'additional-details': 'Reopen it',
        },
        { warrantReturn: { '456': otherCase } }
      );

      expect(req.session.warrantReturn).toEqual({
        '456': otherCase,
        '123': {
          returnType: WarrantReturnType.INTERIM,
          returnName: InterimReturnName.REOPEN_WARRANT,
          additionalDetails: 'Reopen it',
        },
      });
    });
  });

  describe('GET warrantReturn with saved answers', () => {
    it('shows the answers saved in the session for a successful eviction', async () => {
      const res = { render: jest.fn() };

      await getHandler('/case/:caseReference/record-warrant-return')(
        {
          params: { caseReference: '123' },
          session: {
            user: { accessToken: 'token' },
            warrantReturn: {
              '123': {
                returnType: WarrantReturnType.FINAL,
                outcome: EvictionOutcome.SUCCESSFUL,
                returnName: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
                evictionDate: '2026-07-01T09:05:00.000+01:00',
                additionalDetails: 'Details',
              },
            },
          },
        } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );

      expect(res.render.mock.calls[0][1].answers).toEqual({
        returnType: 'FINAL',
        finalOutcome: 'SUCCESSFUL',
        evictionSuccessfulReturnName: 'EVICTION_SUCCESSFUL',
        evictionUnsuccessfulReturnName: '',
        interimReturnName: '',
        additionalDetails: 'Details',
        evictionDate: { day: '1', month: '7', year: '2026', hour: '9', minute: '05' },
      });
    });
  });
});
