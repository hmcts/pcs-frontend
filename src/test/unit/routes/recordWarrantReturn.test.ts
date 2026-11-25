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

import recordWarrantReturnRoutes, { checkYourAnswersRows } from '@routes/recordWarrantReturn';
import { ccdCaseService } from '@services/ccdCaseService';
import {
  EvictionOutcome,
  EvictionSuccessfulReturnName,
  EvictionUnsuccessfulReturnName,
  InterimReturnName,
  WarrantReturn,
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

    it('renders the warrant return page with the case and an empty form, and remembers the case details', async () => {
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
      const session = {
        user: { accessToken: 'token' },
        warrantReturnCaseDetails: { '456': { propertyAddressDisplay: '2 Low Road', caseName: 'Other case' } },
        save: jest.fn((callback: (error?: Error) => void) => callback()),
      };

      await getHandler(basePath)(
        {
          params: { caseReference: '1794231546115667' },
          originalUrl: '/case/1794231546115667/record-warrant-return',
          session,
        } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );

      expect(mockStartCaseEvent).toHaveBeenCalledWith('token', '1794231546115667', 'ext:recordWarrantReturn', {});
      expect(session.warrantReturnCaseDetails).toEqual({
        '1794231546115667': {
          propertyAddressDisplay: '1 High Street, London, SW1A 1AA',
          caseName: 'Housing Ltd vs Sam Smith',
        },
        '456': { propertyAddressDisplay: '2 Low Road', caseName: 'Other case' },
      });
      expect(session.save).toHaveBeenCalled();
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
          returnDateFinal: { day: '', month: '', year: '', hour: '', minute: '' },
          returnDateInterim: { day: '', month: '', year: '', hour: '', minute: '' },
        },
        evictionDateError: undefined,
        returnDateFinalError: undefined,
        returnDateInterimError: undefined,
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
        {
          params: { caseReference: '123' },
          session: { user: { accessToken: 'token' }, save: jest.fn((callback: (error?: Error) => void) => callback()) },
        } as unknown as Request,
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

    it('passes a failure to save the session to the error handler', async () => {
      const failure = new Error('Redis is down');
      const res = { render: jest.fn() };
      const next = jest.fn();

      await getHandler(basePath)(
        {
          params: { caseReference: '123' },
          session: {
            user: { accessToken: 'token' },
            save: jest.fn((callback: (error?: Error) => void) => callback(failure)),
          },
        } as unknown as Request,
        res as unknown as Response,
        next
      );

      expect(next).toHaveBeenCalledWith(failure);
      expect(res.render).not.toHaveBeenCalled();
    });
  });

  describe('GET checkYourAnswers', () => {
    const path = '/case/:caseReference/record-warrant-return/check-your-answers';
    const answers = { returnType: WarrantReturnType.INTERIM, returnName: InterimReturnName.CROWDS_OR_PROTESTS };
    const caseDetails = {
      propertyAddressDisplay: '1 High Street, London, SW1A 1AA',
      caseName: 'Housing Ltd vs Sam Smith',
    };

    it('loads the check your answers page from the session', async () => {
      const res = { render: jest.fn() };

      await getHandler(path)(
        {
          params: { caseReference: '1794231546115667' },
          originalUrl: '/case/1794231546115667/record-warrant-return/check-your-answers',
          session: {
            user: { accessToken: 'token' },
            warrantReturn: { '1794231546115667': answers },
            warrantReturnCaseDetails: { '1794231546115667': caseDetails },
          },
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
          answerRows: checkYourAnswersRows('1794231546115667', answers),
        })
      );
    });

    it.each([
      ['no answers', { warrantReturnCaseDetails: { '123': caseDetails } }],
      ['no case details', { warrantReturn: { '123': answers } }],
    ])('goes back to the start of the event when there are %s', async (_name, saved) => {
      const res = { render: jest.fn(), redirect: jest.fn() };

      await getHandler(path)(
        {
          params: { caseReference: '123' },
          session: { user: { accessToken: 'token' }, ...saved },
        } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );

      expect(res.redirect).toHaveBeenCalledWith('/case/123/record-warrant-return');
      expect(res.render).not.toHaveBeenCalled();
    });
  });

  describe('POST warrantReturn', () => {
    const date = { day: '1', month: '3', year: '2026', hour: '14', minute: '05' };
    const evictionDateFields = (parts: Record<string, string> = date) =>
      Object.fromEntries(Object.entries(parts).map(([part, value]) => [`eviction-date-${part}`, value]));
    const returnDateFinalFields = (parts: Record<string, string> = date) =>
      Object.fromEntries(Object.entries(parts).map(([part, value]) => [`return-date-final-${part}`, value]));
    const returnDateInterimFields = (parts: Record<string, string> = date) =>
      Object.fromEntries(Object.entries(parts).map(([part, value]) => [`return-date-interim-${part}`, value]));

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
        'a successful eviction with no additional details',
        {
          'return-type': WarrantReturnType.FINAL,
          'final-outcome': EvictionOutcome.SUCCESSFUL,
          'eviction-successful-return-name': EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
          ...evictionDateFields(),
        },
        {
          returnType: WarrantReturnType.FINAL,
          evictionOutcome: EvictionOutcome.SUCCESSFUL,
          returnName: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
          outcomeDate: '2026-03-01T14:05:00.000',
          additionalDetails: undefined,
        },
      ],
      [
        'an unsuccessful eviction',
        {
          'return-type': WarrantReturnType.FINAL,
          'final-outcome': EvictionOutcome.UNSUCCESSFUL,
          'eviction-unsuccessful-return-name': EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
          'additional-details': 'Withdrawn by the claimant',
          ...returnDateFinalFields(),
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
          ...returnDateFinalFields(),
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
          ...returnDateInterimFields(),
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
          ...returnDateInterimFields(),
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
        { ...date, month: '', minute: '' },
        'eviction-date-month',
        'The data entered is not valid for Eviction date and time',
      ],
      [{ ...date, day: 'x' }, 'eviction-date-day', 'The data entered is not valid for Eviction date and time'],
      [{ ...date, year: '26' }, 'eviction-date-year', 'The data entered is not valid for Eviction date and time'],
      [
        { ...date, day: '30', month: '2' },
        'eviction-date-day',
        'The data entered is not valid for Eviction date and time',
      ],
      [{ ...date, hour: '24' }, 'eviction-date-day', 'The data entered is not valid for Eviction date and time'],
      [{ ...date, minute: '60' }, 'eviction-date-day', 'The data entered is not valid for Eviction date and time'],
      [
        { ...date, day: '29', month: '3', hour: '1', minute: '30' },
        'eviction-date-day',
        'The data entered is not valid for Eviction date and time',
      ],
      [{ ...date, year: '2999' }, 'eviction-date-day', 'Eviction time cannot be in the future'],
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
          ...returnDateFinalFields(),
          'additional-details': '   ',
        },
        ['additional-details'],
      ],
      [
        'an unsuccessful eviction with no return name',
        {
          'return-type': WarrantReturnType.FINAL,
          'final-outcome': EvictionOutcome.UNSUCCESSFUL,
          ...returnDateFinalFields(),
        },
        ['eviction-unsuccessful-return-name', 'additional-details'],
      ],
      [
        'a cancelled eviction with no return name',
        {
          'return-type': WarrantReturnType.FINAL,
          'final-outcome': EvictionOutcome.CANCELLED,
          ...returnDateFinalFields(),
        },
        ['eviction-unsuccessful-return-name', 'additional-details'],
      ],
      [
        'an interim return with no return name',
        { 'return-type': WarrantReturnType.INTERIM, ...returnDateInterimFields() },
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
      ...returnDateFinalFields(),
    };
    const cancelledEviction = {
      'return-type': WarrantReturnType.FINAL,
      'final-outcome': EvictionOutcome.CANCELLED,
      ...returnDateFinalFields(),
    };
    const interimReturn = { 'return-type': WarrantReturnType.INTERIM, ...returnDateInterimFields() };

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
        ...returnDateInterimFields(),
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
          ...returnDateInterimFields(),
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
      ['a successful eviction', successfulEvictionNoDate, 'eviction-date-day', 'Eviction date and time is required'],
      [
        'an unsuccessful eviction',
        unsuccessfulEvictionNoDate,
        'return-date-final-day',
        'Return date and time is required',
      ],
      ['a cancelled eviction', cancelledEvictionNoDate, 'return-date-final-day', 'Return date and time is required'],
      ['an interim return', interimReturnNoDate, 'return-date-interim-day', 'Return date and time is required'],
    ])('requires an eviction date for %s', async (_name, body, id, errorMessage) => {
      const { req, res } = await post(body);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render.mock.calls[0][1].validationErrors).toEqual({
        [id]: { text: errorMessage },
      });
      expect(res.render.mock.calls[0][1].errorSummary.errorList).toEqual([{ text: errorMessage, href: `#${id}` }]);
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
    const caseDetails = {
      propertyAddressDisplay: '1 High Street, London, SW1A 1AA',
      caseName: 'Housing Ltd vs Sam Smith',
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
          warrantReturnCaseDetails: { '123': caseDetails },
          save: jest.fn((callback: (error?: Error) => void) => callback()),
        },
      };
      const next = jest.fn();
      await postHandler(path)(req as unknown as Request, res as unknown as Response, next);
      // A refusal renders once the case details load.
      await new Promise(setImmediate);
      return { req, res, next };
    };

    it('goes back to the warrant return page for previous and keeps the answers', async () => {
      const { req, res } = await post({ action: 'previous' }, successful);

      expect(res.redirect).toHaveBeenCalledWith('/case/123/record-warrant-return');
      expect(mockStartAndSubmitEvent).not.toHaveBeenCalled();
      expect(req.session.warrantReturn).toEqual({ '123': successful, '456': { returnType: 'INTERIM' } });
    });

    it('asks for the answers again when the session has none', async () => {
      const { res } = await post({ action: 'continue' });

      expect(res.redirect).toHaveBeenCalledWith('/case/123/record-warrant-return');
      expect(mockStartAndSubmitEvent).not.toHaveBeenCalled();
    });

    it('submits the answers, forgets them and shows the confirmation', async () => {
      const { req, res } = await post({ action: 'continue' }, successful);

      expect(mockStartAndSubmitEvent).toHaveBeenCalledWith('token', '123', 'ext:recordWarrantReturn', {
        warrantReturn: { ...successful, outcomeDate: '2026-07-01T07:05:00.000' },
      });
      expect(req.session.warrantReturn).toEqual({ '456': { returnType: 'INTERIM' } });
      expect(req.session).toEqual(
        expect.objectContaining({
          warrantReturnConfirmation: {
            '123': {
              returnType: WarrantReturnType.FINAL,
              evictionOutcome: EvictionOutcome.SUCCESSFUL,
              returnName: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
            },
          },
        })
      );
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
          propertyAddressDisplay: '1 High Street, London, SW1A 1AA',
          caseName: 'Housing Ltd vs Sam Smith',
          answerRows: checkYourAnswersRows('123', successful as WarrantReturn),
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

    it('goes back to the start of the event when a refused return has no case details', async () => {
      mockStartAndSubmitEvent.mockRejectedValueOnce(
        new CallbackRejectedError(['There is no warrant on this case'], 422)
      );
      const res = { status: jest.fn().mockReturnThis(), render: jest.fn(), redirect: jest.fn() };

      await postHandler(path)(
        {
          params: { caseReference: '123' },
          body: { action: 'continue' },
          session: { user: { accessToken: 'token' }, warrantReturn: { '123': successful } },
        } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );
      await new Promise(setImmediate);

      expect(res.redirect).toHaveBeenCalledWith('/case/123/record-warrant-return');
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
    const path = '/case/:caseReference/record-warrant-return/cancel';
    const saved = { returnType: WarrantReturnType.INTERIM, returnName: InterimReturnName.CROWDS_OR_PROTESTS };

    const cancel = (save = jest.fn((callback: (error?: Error) => void) => callback())) => {
      const res = { redirect: jest.fn() };
      const next = jest.fn();
      const req = {
        params: { caseReference: '123' },
        session: { warrantReturn: { '123': saved, '456': saved }, save },
      };
      void getHandler(path)(req as unknown as Request, res as unknown as Response, next);
      return { req, res, next };
    };

    it('returns the user to the case in XUI and clears the progress', () => {
      const { req, res } = cancel();

      expect(req.session.warrantReturn).toEqual({ '456': saved });
      expect(req.session.save).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(expect.stringMatching(/\/cases\/case-details\/PCS\/PCS\/123$/));
    });

    it('passes a failure to save the session to the error handler', () => {
      const failure = new Error('Redis is down');
      const { res, next } = cancel(jest.fn((callback: (error?: Error) => void) => callback(failure)));

      expect(next).toHaveBeenCalledWith(failure);
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });

  describe('GET warrantReturn with saved answers', () => {
    const noEvictionDate = { day: '', month: '', year: '', hour: '', minute: '' };
    const noFinalReturnDate = { day: '', month: '', year: '', hour: '', minute: '' };
    const noInterimReturnDate = { day: '', month: '', year: '', hour: '', minute: '' };

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
          evictionDate: { day: '1', month: '7', year: '2026', hour: '8', minute: '05' },
          returnDateFinal: noFinalReturnDate,
          returnDateInterim: noInterimReturnDate,
        },
      ],
      [
        'an unsuccessful eviction',
        {
          returnType: WarrantReturnType.FINAL,
          evictionOutcome: EvictionOutcome.UNSUCCESSFUL,
          returnName: EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
          outcomeDate: '2026-07-01T08:05:00.000',
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
          returnDateFinal: { day: '1', month: '7', year: '2026', hour: '8', minute: '05' },
          returnDateInterim: noInterimReturnDate,
        },
      ],
      [
        'a cancelled eviction',
        {
          returnType: WarrantReturnType.FINAL,
          evictionOutcome: EvictionOutcome.CANCELLED,
          returnName: EvictionUnsuccessfulReturnName.WARRANT_EXPIRED,
          outcomeDate: '2026-07-01T08:05:00.000',
        },
        {
          returnType: 'FINAL',
          finalOutcome: 'CANCELLED',
          evictionSuccessfulReturnName: '',
          evictionUnsuccessfulReturnName: 'WARRANT_EXPIRED',
          interimReturnName: '',
          additionalDetails: '',
          evictionDate: noEvictionDate,
          returnDateFinal: { day: '1', month: '7', year: '2026', hour: '8', minute: '05' },
          returnDateInterim: noInterimReturnDate,
        },
      ],
      [
        'an interim return',
        {
          returnType: WarrantReturnType.INTERIM,
          returnName: InterimReturnName.REOPEN_WARRANT,
          outcomeDate: '2026-07-01T08:05:00.000',
        },
        {
          returnType: 'INTERIM',
          finalOutcome: '',
          evictionSuccessfulReturnName: '',
          evictionUnsuccessfulReturnName: '',
          interimReturnName: 'REOPEN_WARRANT',
          additionalDetails: '',
          evictionDate: noEvictionDate,
          returnDateFinal: noFinalReturnDate,
          returnDateInterim: { day: '1', month: '7', year: '2026', hour: '8', minute: '05' },
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
          returnDateFinal: noFinalReturnDate,
          returnDateInterim: noInterimReturnDate,
        },
      ],
    ])('shows the answers saved in the session for %s', async (_name, saved, answers) => {
      const res = { render: jest.fn() };

      await getHandler(basePath)(
        {
          params: { caseReference: '123' },
          session: {
            user: { accessToken: 'token' },
            warrantReturn: saved ? { '123': saved } : undefined,
            save: jest.fn((callback: (error?: Error) => void) => callback()),
          },
        } as unknown as Request,
        res as unknown as Response,
        jest.fn()
      );

      expect(res.render.mock.calls[0][1].answers).toEqual(answers);
    });
  });

  describe('checkYourAnswersRows', () => {
    const change = (visuallyHiddenText: string) => ({
      items: [{ href: '/case/123/record-warrant-return', text: 'Change', visuallyHiddenText }],
    });

    it.each([
      [
        'a successful eviction',
        {
          returnType: WarrantReturnType.FINAL,
          evictionOutcome: EvictionOutcome.SUCCESSFUL,
          returnName: EvictionSuccessfulReturnName.EVICTION_SUCCESSFUL,
          outcomeDate: '2026-07-01T08:05:00.000',
          additionalDetails: 'Keys handed over\nLocks changed',
        },
        [
          { key: { text: 'Return' }, value: { text: 'Final' }, actions: change('return') },
          { key: { text: 'Outcome' }, value: { text: 'Eviction successful' }, actions: change('outcome') },
          { key: { text: 'Return name' }, value: { text: 'Eviction successful' }, actions: change('return name') },
          {
            key: { text: 'Eviction date and time' },
            value: { text: '1 Jul 2026, 8:05:00 AM' },
            actions: change('eviction date and time'),
          },
          {
            key: { text: 'Additional details' },
            value: { html: 'Keys handed over<br>Locks changed' },
            actions: change('additional details'),
          },
        ],
      ],
      [
        'a cancelled eviction',
        {
          returnType: WarrantReturnType.FINAL,
          evictionOutcome: EvictionOutcome.CANCELLED,
          returnName: EvictionUnsuccessfulReturnName.WARRANT_WITHDRAWN,
          outcomeDate: '2026-01-15T13:05:00.000',
        },
        [
          { key: { text: 'Return' }, value: { text: 'Final' }, actions: change('return') },
          { key: { text: 'Outcome' }, value: { text: 'Eviction cancelled' }, actions: change('outcome') },
          { key: { text: 'Return name' }, value: { text: 'Warrant withdrawn' }, actions: change('return name') },
          {
            key: { text: 'Return date and time' },
            value: { text: '15 Jan 2026, 1:05:00 PM' },
            actions: change('return date and time'),
          },
        ],
      ],
      [
        'an interim return',
        {
          returnType: WarrantReturnType.INTERIM,
          returnName: InterimReturnName.CROWDS_OR_PROTESTS,
          outcomeDate: '2026-03-01T00:00:00.000',
          additionalDetails: 'Crowd at the door',
        },
        [
          { key: { text: 'Return' }, value: { text: 'Interim' }, actions: change('return') },
          { key: { text: 'Return name' }, value: { text: 'Crowds or protests' }, actions: change('return name') },
          {
            key: { text: 'Return date and time' },
            value: { text: '1 Mar 2026, 12:00:00 AM' },
            actions: change('return date and time'),
          },
          {
            key: { text: 'Additional details' },
            value: { html: 'Crowd at the door' },
            actions: change('additional details'),
          },
        ],
      ],
    ])('lists the answers for %s', (_name, warrantReturn, rows) => {
      expect(checkYourAnswersRows('123', warrantReturn)).toEqual(rows);
    });
  });
});
