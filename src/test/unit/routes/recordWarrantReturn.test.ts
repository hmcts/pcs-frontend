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
      eventToken: 'event-token',
    }),
    startAndSubmitEvent: jest.fn().mockResolvedValue({}),
  },
}));

import { Application } from 'express';

import { CallbackRejectedError, HTTPError } from '../../../main/HttpError';
import { oidcMiddleware } from '../../../main/middleware';

import recordWarrantReturnRoutes from '@routes/recordWarrantReturn';
import { ccdCaseService } from '@services/ccdCaseService';
import {
  EvictionOutcome,
  EvictionSuccessfulReturnName,
  EvictionUnsuccessfulReturnName,
  InterimReturnName,
  WarrantReturnType,
  evictionOutcomeList,
  evictionSuccessfulReturnTypeList,
  evictionUnsuccessfulReturnTypeList,
  interimReturnTypeList,
  warrantReturnTypeList,
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

  const basePath = '/case/:caseReference/record-warrant-return';

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
    it.each([
      ['warrant return', basePath],
      ['check your answers', `${basePath}/check-your-answers`],
      ['confirmation', `${basePath}/confirmed`],
      ['cancel', `${basePath}/cancel`],
    ])('registers the %s GET route', (_name, path) => {
      expect(app.get).toHaveBeenCalledWith(path, oidcMiddleware, expect.any(Function));
    });

    it.each([
      ['warrant return', basePath],
      ['check your answers', `${basePath}/check-your-answers`],
    ])('registers the %s POST route', (_name, path) => {
      expect(app.post).toHaveBeenCalledWith(path, oidcMiddleware, expect.any(Function));
    });
  });

  describe('GET warrantReturn', () => {
    const mockStartCaseEvent = ccdCaseService.startCaseEvent as jest.Mock;

    it('renders the warrant return page with the case and an empty form', async () => {
      mockStartCaseEvent.mockReturnValueOnce({
        data: {
          claimantType: {
            value: { code: 'PROVIDER_OF_SOCIAL_HOUSING', label: 'Registered provider of social housing' },
          },
          propertyAddress: { AddressLine1: '1 High Street', PostTown: 'London', PostCode: 'SW1A 1AA' },
          caseNameHmctsInternal: 'Housing Ltd vs Sam Smith',
          allClaimants: [{ value: { orgName: 'Housing Ltd' } }],
          allDefendants: [
            { value: { nameKnown: 'YES', firstName: 'Sam', lastName: 'Smith' } },
            { value: { nameKnown: 'NO' } },
          ],
        },
        eventToken: 'event-token',
      });
      const res = { render: jest.fn() };

      await getHandler(basePath)(
        {
          params: { caseReference: '1794231546115667' },
          originalUrl: '/case/1794231546115667/record-warrant-return',
          session: { user: { accessToken: 'token' } },
        } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );

      expect(mockStartCaseEvent).toHaveBeenCalledWith('token', '1794231546115667', 'ext:recordWarrantReturn', {});
      expect(res.render).toHaveBeenCalledTimes(1);
      const [template, model] = res.render.mock.calls[0];
      expect(template).toBe('record-warrant-return/warrant-return');
      expect(model).toEqual({
        footerModel: expect.any(Object),
        headerModel: expect.any(Object),
        formAction: '/case/1794231546115667/record-warrant-return',
        errorSummary: undefined,
        validationErrors: {},
        cancelUrl: '/case/1794231546115667/record-warrant-return/cancel',
        continueUrl: '/case/1794231546115667/record-warrant-return/check-your-answers',
        warrantReturnTypeList,
        evictionOutcomeList,
        evictionSuccessfulReturnTypeList,
        evictionUnsuccessfulReturnTypeList,
        interimReturnTypeList,
        additionalDetailsMaxLength: 6800,
        answers: {
          returnType: '',
          finalOutcome: '',
          evictionSuccessfulReturnName: '',
          evictionUnsuccessfulReturnName: '',
          interimReturnName: '',
          additionalDetails: '',
          evictionDate: { day: '', month: '', year: '', hour: '', minute: '' },
        },
        evictionDateError: undefined,
        evictionData: {
          card: { title: { text: 'Eviction details' } },
          rows: [
            { key: { text: 'Claimant type' }, value: { text: 'Registered provider of social housing' } },
            { key: { text: 'Claimant name' }, value: { html: '<ul class="govuk-list"><li>Housing Ltd</li></ul>' } },
            {
              key: { text: 'Defendant(s) name(s)' },
              value: { html: '<ul class="govuk-list"><li>Sam Smith</li><li>person(s) unknown</li></ul>' },
            },
          ],
        },
        caseReferenceDisplay: '1794-2315-4611-5667',
        propertyAddressDisplay: '1 High Street, London, SW1A 1AA',
        caseName: 'Housing Ltd vs Sam Smith',
      });
    });

    it('leaves the case details blank when CCD returns none', async () => {
      mockStartCaseEvent.mockReturnValueOnce({ data: {}, eventToken: 'event-token' });
      const res = { render: jest.fn() };

      await getHandler(basePath)(
        { params: { caseReference: '123' }, session: { user: { accessToken: 'token' } } } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );

      expect(res.render.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          evictionData: {
            card: { title: { text: 'Eviction details' } },
            rows: [
              { key: { text: 'Claimant type' }, value: { text: undefined } },
              { key: { text: 'Claimant name' }, value: { html: '' } },
              { key: { text: 'Defendant(s) name(s)' }, value: { html: '' } },
            ],
          },
          propertyAddressDisplay: undefined,
          caseName: undefined,
        })
      );
    });

    const get = async () => {
      const res = { status: jest.fn().mockReturnThis(), render: jest.fn(), send: jest.fn() };
      const next = jest.fn();
      await getHandler(basePath)(
        { params: { caseReference: '123' }, session: { user: { accessToken: 'token' } } } as unknown as Request,
        res as unknown as Response,
        next
      );
      return { res, next };
    };

    it('passes a failure to load the case to the error handler', async () => {
      const failure = new HTTPError('CCD is down', 502);
      mockStartCaseEvent.mockRejectedValueOnce(failure);

      const { res, next } = await get();

      expect(next).toHaveBeenCalledWith(failure);
      expect(res.render).not.toHaveBeenCalled();
    });

    it('shows Not Found when CCD will not let the user start the event', async () => {
      mockStartCaseEvent.mockRejectedValueOnce(new HTTPError('Forbidden', 403));

      const { res, next } = await get();

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith('Not Found');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('GET checkYourAnswers', () => {
    it('passes a failure to load the case to the error handler', async () => {
      const failure = new HTTPError('CCD is down', 502);
      (ccdCaseService.startCaseEvent as jest.Mock).mockRejectedValueOnce(failure);
      const res = { render: jest.fn() };
      const next = jest.fn();

      await getHandler('/case/:caseReference/record-warrant-return/check-your-answers')(
        { params: { caseReference: '123' }, session: { user: { accessToken: 'token' } } } as unknown as Request,
        res as unknown as Response,
        next
      );

      expect(next).toHaveBeenCalledWith(failure);
      expect(res.render).not.toHaveBeenCalled();
    });

    it('loads the check your answers page', async () => {
      (ccdCaseService.startCaseEvent as jest.Mock).mockReturnValueOnce({
        data: {
          propertyAddress: { AddressLine1: '1 High Street', PostTown: 'London', PostCode: 'SW1A 1AA' },
          caseNameHmctsInternal: 'Housing Ltd vs Sam Smith',
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
          caseName: 'Housing Ltd vs Sam Smith',
        })
      );
    });
  });

  describe('POST warrantReturn', () => {
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
      await postHandler(basePath)(req as unknown as Request, res as unknown as Response, next);
      return { req, res, next };
    };

    const errorIds = (res: { render: jest.Mock }): string[] =>
      Object.keys(res.render.mock.calls[0][1].validationErrors);

    it('renders validation errors when no return type is supplied', async () => {
      const { res } = await post({});

      expect(res.status).toHaveBeenCalledWith(400);
      expect(errorIds(res)).toEqual(['return-type', 'additional-details']);
      expect(res.render).toHaveBeenCalledWith(
        'record-warrant-return/warrant-return',
        expect.objectContaining({ evictionData: expect.any(Object), caseReferenceDisplay: '123' })
      );
    });

    it('requires a final outcome for a final return', async () => {
      const { res } = await post({ 'return-type': WarrantReturnType.FINAL });

      expect(errorIds(res)).toEqual(['final-outcome', 'additional-details']);
    });

    it.each([
      [
        'a successful eviction',
        {
          'return-type': WarrantReturnType.FINAL,
          'final-outcome': EvictionOutcome.SUCCESSFUL,
          'eviction-successful-return-name': EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
          'additional-details': 'Keys handed to claimant',
          ...evictionDateFields(),
        },
        {
          returnType: WarrantReturnType.FINAL,
          evictionOutcome: EvictionOutcome.SUCCESSFUL,
          returnName: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
          outcomeDate: '2026-03-01T14:05:00.000',
          additionalDetails: 'Keys handed to claimant',
        },
      ],
      [
        'an unsuccessful eviction',
        {
          'return-type': WarrantReturnType.FINAL,
          'final-outcome': EvictionOutcome.UNSUCCESSFUL,
          'eviction-unsuccessful-return-name': EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
          'additional-details': 'Withdrawn by the claimant',
          ...evictionDateFields(),
        },
        {
          returnType: WarrantReturnType.FINAL,
          evictionOutcome: EvictionOutcome.UNSUCCESSFUL,
          returnName: EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
          outcomeDate: '2026-03-01T14:05:00.000',
          additionalDetails: 'Withdrawn by the claimant',
        },
      ],
      [
        'a cancelled eviction',
        {
          'return-type': WarrantReturnType.FINAL,
          'final-outcome': EvictionOutcome.CANCELLED,
          'eviction-unsuccessful-return-name': EvictionUnsuccessfulReturnName.WARRANT_EXPIRED,
          ...evictionDateFields(),
        },
        {
          returnType: WarrantReturnType.FINAL,
          evictionOutcome: EvictionOutcome.CANCELLED,
          returnName: EvictionUnsuccessfulReturnName.WARRANT_EXPIRED,
          outcomeDate: '2026-03-01T14:05:00.000',
          additionalDetails: undefined,
        },
      ],
      [
        'an interim return with mandatory additional details',
        {
          'return-type': WarrantReturnType.INTERIM,
          'interim-return-name': InterimReturnName.REOPEN_WARRANT,
          'additional-details': 'Reopen it',
          ...evictionDateFields(),
        },
        {
          returnType: WarrantReturnType.INTERIM,
          returnName: InterimReturnName.REOPEN_WARRANT,
          outcomeDate: '2026-03-01T14:05:00.000',
          additionalDetails: 'Reopen it',
        },
      ],
      [
        'an interim return name with no additional details',
        {
          'return-type': WarrantReturnType.INTERIM,
          'interim-return-name': InterimReturnName.CROWDS_OR_PROTESTS,
          ...evictionDateFields(),
        },
        {
          returnType: WarrantReturnType.INTERIM,
          returnName: InterimReturnName.CROWDS_OR_PROTESTS,
          outcomeDate: '2026-03-01T14:05:00.000',
          additionalDetails: undefined,
        },
      ],
    ])('saves a warrant return with %s and redirects to check your answers', async (_name, body, saved) => {
      const { req, res } = await post(body);

      expect(res.render).not.toHaveBeenCalled();
      expect(req.session.warrantReturn).toEqual({ '123': saved });
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

    it.each([
      [
        'an unsuccessful return name that needs them, given only spaces',
        {
          'return-type': WarrantReturnType.FINAL,
          'final-outcome': EvictionOutcome.UNSUCCESSFUL,
          'eviction-unsuccessful-return-name': EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
          ...evictionDateFields(),
          'additional-details': '   ',
        },
        ['additional-details'],
      ],
      [
        'an unsuccessful eviction with no return name',
        {
          'return-type': WarrantReturnType.FINAL,
          'final-outcome': EvictionOutcome.UNSUCCESSFUL,
          ...evictionDateFields(),
        },
        ['eviction-unsuccessful-return-name', 'additional-details'],
      ],
      [
        'a cancelled eviction with no return name',
        { 'return-type': WarrantReturnType.FINAL, 'final-outcome': EvictionOutcome.CANCELLED, ...evictionDateFields() },
        ['eviction-unsuccessful-return-name', 'additional-details'],
      ],
      [
        'an interim return with no return name',
        { 'return-type': WarrantReturnType.INTERIM, ...evictionDateFields() },
        ['interim-return-name', 'additional-details'],
      ],
    ])('requires additional details for %s', async (_name, body, ids) => {
      const { res } = await post(body);

      expect(errorIds(res)).toEqual(ids);
      expect(res.render.mock.calls[0][1].validationErrors['additional-details']).toEqual({
        text: 'Additional details is required',
      });
    });

    const successfulEviction = {
      'return-type': WarrantReturnType.FINAL,
      'final-outcome': EvictionOutcome.SUCCESSFUL,
      ...evictionDateFields(),
    };
    const unsuccessfulEviction = {
      'return-type': WarrantReturnType.FINAL,
      'final-outcome': EvictionOutcome.UNSUCCESSFUL,
      ...evictionDateFields(),
    };
    const cancelledEviction = {
      'return-type': WarrantReturnType.FINAL,
      'final-outcome': EvictionOutcome.CANCELLED,
      ...evictionDateFields(),
    };
    const interimReturn = { 'return-type': WarrantReturnType.INTERIM, ...evictionDateFields() };

    it.each([
      ['a successful eviction', successfulEviction, 'eviction-successful-return-name'],
      ['an unsuccessful eviction', unsuccessfulEviction, 'eviction-unsuccessful-return-name'],
      ['a cancelled eviction', cancelledEviction, 'eviction-unsuccessful-return-name'],
      ['an interim return', interimReturn, 'interim-return-name'],
    ])('requires a return name for %s', async (_name, body, id) => {
      const { req, res } = await post({ ...body, 'additional-details': 'Details' });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render.mock.calls[0][1].validationErrors).toEqual({ [id]: { text: 'Return name is required' } });
      expect(res.render.mock.calls[0][1].errorSummary.errorList).toEqual([
        { text: 'Return name is required', href: `#${id}` },
      ]);
      expect(req.session.warrantReturn).toBeUndefined();
    });

    it('rejects additional details over the maximum length', async () => {
      const { res } = await post({
        'return-type': WarrantReturnType.INTERIM,
        'interim-return-name': InterimReturnName.CROWDS_OR_PROTESTS,
        ...evictionDateFields(),
        'additional-details': 'a'.repeat(6801),
      });

      expect(res.render.mock.calls[0][1].validationErrors).toEqual({
        'additional-details': { text: 'Additional details must be 6,800 characters or fewer' },
      });
    });

    it('passes a failure to load the case for the error page to the error handler', async () => {
      const failure = new HTTPError('CCD is down', 502);
      (ccdCaseService.startCaseEvent as jest.Mock).mockRejectedValueOnce(failure);

      const { res, next } = await post({});

      expect(next).toHaveBeenCalledWith(failure);
      expect(res.render).not.toHaveBeenCalled();
    });

    it('passes a failure to save the session to the error handler', async () => {
      const failure = new Error('Redis is down');
      const { res, next } = await post(
        {
          'return-type': WarrantReturnType.INTERIM,
          'interim-return-name': InterimReturnName.CROWDS_OR_PROTESTS,
          ...evictionDateFields(),
        },
        { save: jest.fn((callback: (error?: Error) => void) => callback(failure)) }
      );

      expect(next).toHaveBeenCalledWith(failure);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    const successfulEvictionNoDate = {
      'return-type': WarrantReturnType.FINAL,
      'final-outcome': EvictionOutcome.SUCCESSFUL,
      'eviction-successful-return-name': EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
      'additional-details': 'Keys handed to claimant',
    };
    const unsuccessfulEvictionNoDate = {
      'return-type': WarrantReturnType.FINAL,
      'final-outcome': EvictionOutcome.UNSUCCESSFUL,
      'eviction-unsuccessful-return-name': EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
      'additional-details': 'Withdrawn',
    };
    const cancelledEvictionNoDate = {
      'return-type': WarrantReturnType.FINAL,
      'final-outcome': EvictionOutcome.CANCELLED,
      'eviction-unsuccessful-return-name': EvictionUnsuccessfulReturnName.WARRANT_EXPIRED,
      'additional-details': 'Cancelled',
    };
    const interimReturnNoDate = {
      'return-type': WarrantReturnType.INTERIM,
      'interim-return-name': InterimReturnName.REOPEN_WARRANT,
      'additional-details': 'Reopen it',
    };

    it.each([
      ['a successful eviction', successfulEvictionNoDate, 'eviction-date-day'],
      ['an unsuccessful eviction', unsuccessfulEvictionNoDate, 'eviction-date-day'],
      ['a cancelled eviction', cancelledEvictionNoDate, 'eviction-date-day'],
      ['an interim return', interimReturnNoDate, 'eviction-date-day'],
    ])('requires an eviction date for %s', async (_name, body, id) => {
      const { req, res } = await post(body);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render.mock.calls[0][1].validationErrors).toEqual({
        [id]: { text: 'Eviction date and time is required' },
      });
      expect(res.render.mock.calls[0][1].errorSummary.errorList).toEqual([
        { text: 'Eviction date and time is required', href: `#${id}` },
      ]);
      expect(req.session.warrantReturn).toBeUndefined();
    });
  });

  describe('POST checkYourAnswers', () => {
    const path = '/case/:caseReference/record-warrant-return/check-your-answers';
    const mockStartAndSubmitEvent = ccdCaseService.startAndSubmitEvent as jest.Mock;

    const successful = {
      returnType: WarrantReturnType.FINAL,
      evictionOutcome: EvictionOutcome.SUCCESSFUL,
      returnName: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
      outcomeDate: '2026-07-01T08:05:00.000',
      additionalDetails: 'Keys handed over',
    };

    const post = async (body: Record<string, unknown>, warrantReturn?: Record<string, unknown>) => {
      const res = { status: jest.fn().mockReturnThis(), render: jest.fn(), redirect: jest.fn() };
      const req = {
        params: { caseReference: '123' },
        originalUrl: '/case/123/record-warrant-return/check-your-answers',
        body,
        session: {
          user: { accessToken: 'token' },
          warrantReturn: warrantReturn ? { '123': warrantReturn, '456': { returnType: 'INTERIM' } } : undefined,
          save: jest.fn((callback: (error?: Error) => void) => callback()),
        },
      };
      const next = jest.fn();
      await postHandler(path)(req as unknown as Request, res as unknown as Response, next);
      // A refusal renders once the case details load.
      await new Promise(setImmediate);
      return { req, res, next };
    };

    it('goes back to the warrant return page for previous', async () => {
      const { res } = await post({ action: 'previous' }, successful);

      expect(res.redirect).toHaveBeenCalledWith('/case/123/record-warrant-return');
      expect(mockStartAndSubmitEvent).not.toHaveBeenCalled();
    });

    it('asks for the answers again when the session has none', async () => {
      const { res } = await post({ action: 'continue' });

      expect(res.redirect).toHaveBeenCalledWith('/case/123/record-warrant-return');
      expect(mockStartAndSubmitEvent).not.toHaveBeenCalled();
    });

    it('submits the answers, forgets them and shows the confirmation', async () => {
      const { req, res } = await post({ action: 'continue' }, successful);

      expect(mockStartAndSubmitEvent).toHaveBeenCalledWith('token', '123', 'ext:recordWarrantReturn', {
        warrantReturn: successful,
      });
      expect(req.session.warrantReturn).toEqual({ '456': { returnType: 'INTERIM' } });
      expect(req.session.save).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith('/case/123/record-warrant-return/confirmed');
    });

    it('submits a return without an eviction date', async () => {
      await post(
        { action: 'continue' },
        { returnType: WarrantReturnType.INTERIM, returnName: InterimReturnName.CROWDS_OR_PROTESTS }
      );

      expect(mockStartAndSubmitEvent.mock.calls[0][3]).toEqual({
        warrantReturn: { returnType: 'INTERIM', returnName: 'CROWDS_OR_PROTESTS' },
      });
      expect(JSON.stringify(mockStartAndSubmitEvent.mock.calls[0][3])).not.toContain('outcomeDate');
    });

    it('shows why pcs-api refused the return and keeps the answers', async () => {
      mockStartAndSubmitEvent.mockRejectedValueOnce(
        new CallbackRejectedError(['There is no warrant on this case'], 422)
      );

      const { req, res } = await post({ action: 'continue' }, successful);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.render).toHaveBeenCalledWith(
        'record-warrant-return/check-your-answers',
        expect.objectContaining({
          validationErrors: { 'record-warrant-return-form': { text: 'There is no warrant on this case' } },
          caseReferenceDisplay: '123',
        })
      );
      expect(req.session.warrantReturn?.['123']).toEqual(successful);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('passes any other failure to the error handler', async () => {
      const failure = new HTTPError('CCD is down', 502);
      mockStartAndSubmitEvent.mockRejectedValueOnce(failure);

      const { req, next, res } = await post({ action: 'continue' }, successful);

      expect(next).toHaveBeenCalledWith(failure);
      expect(req.session.warrantReturn?.['123']).toEqual(successful);
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('passes a failure to load the case after a refusal to the error handler', async () => {
      const failure = new HTTPError('CCD is down', 502);
      mockStartAndSubmitEvent.mockRejectedValueOnce(
        new CallbackRejectedError(['There is no warrant on this case'], 422)
      );
      (ccdCaseService.startCaseEvent as jest.Mock).mockRejectedValueOnce(failure);

      const { res, next } = await post({ action: 'continue' }, successful);

      expect(next).toHaveBeenCalledWith(failure);
      expect(res.render).not.toHaveBeenCalled();
    });

    it('passes a failure to save the session after submitting to the error handler', async () => {
      const failure = new Error('Redis is down');
      const res = { redirect: jest.fn() };
      const next = jest.fn();

      await postHandler(path)(
        {
          params: { caseReference: '123' },
          body: { action: 'continue' },
          session: {
            user: { accessToken: 'token' },
            warrantReturn: { '123': successful },
            save: jest.fn((callback: (error?: Error) => void) => callback(failure)),
          },
        } as unknown as Request,
        res as unknown as Response,
        next
      );

      expect(mockStartAndSubmitEvent).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(failure);
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  describe('GET confirmed', () => {
    it('renders the confirmation page', () => {
      const res = { render: jest.fn() };

      void getHandler('/case/:caseReference/record-warrant-return/confirmed')(
        {
          params: { caseReference: '123' },
          originalUrl: '/case/123/record-warrant-return/confirmed',
        } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );

      expect(res.render).toHaveBeenCalledWith(
        'record-warrant-return/confirmation',
        expect.objectContaining({ cancelUrl: '/case/123/record-warrant-return/cancel' })
      );
    });
  });

  describe('GET cancel', () => {
    it('returns the user to the case in XUI', () => {
      const res = { redirect: jest.fn() };

      void getHandler('/case/:caseReference/record-warrant-return/cancel')(
        { params: { caseReference: '123' } } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );

      expect(res.redirect).toHaveBeenCalledWith(expect.stringMatching(/\/cases\/case-details\/PCS\/PCS\/123$/));
    });
  });

  describe('GET warrantReturn with saved answers', () => {
    const noEvictionDate = { day: '', month: '', year: '', hour: '', minute: '' };

    it.each([
      [
        'a successful eviction',
        {
          returnType: WarrantReturnType.FINAL,
          evictionOutcome: EvictionOutcome.SUCCESSFUL,
          returnName: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
          outcomeDate: '2026-07-01T08:05:00.000',
          additionalDetails: 'Details',
        },
        {
          returnType: 'FINAL',
          finalOutcome: 'SUCCESSFUL',
          evictionSuccessfulReturnName: 'EVICTION_SUCCESSFUL',
          evictionUnsuccessfulReturnName: '',
          interimReturnName: '',
          additionalDetails: 'Details',
          evictionDate: { day: '1', month: '7', year: '2026', hour: '9', minute: '05' },
        },
      ],
      [
        'an unsuccessful eviction',
        {
          returnType: WarrantReturnType.FINAL,
          evictionOutcome: EvictionOutcome.UNSUCCESSFUL,
          returnName: EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
          additionalDetails: 'Withdrawn',
        },
        {
          returnType: 'FINAL',
          finalOutcome: 'UNSUCCESSFUL',
          evictionSuccessfulReturnName: '',
          evictionUnsuccessfulReturnName: 'WARRANT_WITHDRAWN',
          interimReturnName: '',
          additionalDetails: 'Withdrawn',
          evictionDate: noEvictionDate,
        },
      ],
      [
        'a cancelled eviction',
        {
          returnType: WarrantReturnType.FINAL,
          evictionOutcome: EvictionOutcome.CANCELLED,
          returnName: EvictionUnsuccessfulReturnName.WARRANT_EXPIRED,
        },
        {
          returnType: 'FINAL',
          finalOutcome: 'CANCELLED',
          evictionSuccessfulReturnName: '',
          evictionUnsuccessfulReturnName: 'WARRANT_EXPIRED',
          interimReturnName: '',
          additionalDetails: '',
          evictionDate: noEvictionDate,
        },
      ],
      [
        'an interim return',
        { returnType: WarrantReturnType.INTERIM, returnName: InterimReturnName.REOPEN_WARRANT },
        {
          returnType: 'INTERIM',
          finalOutcome: '',
          evictionSuccessfulReturnName: '',
          evictionUnsuccessfulReturnName: '',
          interimReturnName: 'REOPEN_WARRANT',
          additionalDetails: '',
          evictionDate: noEvictionDate,
        },
      ],
      [
        'nothing saved yet',
        undefined,
        {
          returnType: '',
          finalOutcome: '',
          evictionSuccessfulReturnName: '',
          evictionUnsuccessfulReturnName: '',
          interimReturnName: '',
          additionalDetails: '',
          evictionDate: noEvictionDate,
        },
      ],
    ])('shows the answers saved in the session for %s', async (_name, saved, answers) => {
      const res = { render: jest.fn() };

      await getHandler(basePath)(
        {
          params: { caseReference: '123' },
          session: { user: { accessToken: 'token' }, warrantReturn: saved ? { '123': saved } : undefined },
        } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );

      expect(res.render.mock.calls[0][1].answers).toEqual(answers);
    });
  });
});
