jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    startCaseEvent: jest.fn(),
    submitCaseEvent: jest.fn(),
  },
}));
jest.mock('@utils/xuiUtils', () => ({
  ...jest.requireActual('@utils/xuiUtils'),
  manageCaseDetailsUrl: (caseReference: string) => `/cases/case-details/${caseReference}`,
  xuiHeaderModel: jest.fn(),
}));
jest.mock('@utils/orderCase', () => ({ refusalPage: jest.fn() }));

import { Application, Request, Response } from 'express';

import { CallbackRejectedError } from '../../../main/HttpError';

import scheduleEvictionRoutes from '@routes/scheduleEviction';
import { ccdCaseService } from '@services/ccdCaseService';
import { DATE_IN_PAST, DATE_REQUIRED } from '@utils/scheduleEviction';

type Handler = (req: Request, res: Response, next?: jest.Mock) => Promise<void> | void;

const BASE = '/case/:caseReference/schedule-eviction';
const CASE_URL = '/case/1234/schedule-eviction';

const START = {
  enforcementApplicationId: 'app-1',
  caseNumber: '1234-5678-9101-1121',
  propertyAddress: '15 Garden Drive',
  caseName: 'Luton housing vs Billy Wright',
  claimantNames: ['Luton housing'],
  defendantNames: ['Billy Wright'],
};

describe('scheduleEvictionRoutes', () => {
  let app: Application;
  let res: Response;

  // The handler is the last argument, after the middleware.
  const handler = (method: 'get' | 'post', path: string): Handler => {
    const call = (app[method] as jest.Mock).mock.calls.find(([routePath]) => routePath === BASE + path);
    return call[call.length - 1];
  };

  const request = (session: Record<string, unknown>, body: Record<string, unknown> = {}) =>
    ({
      params: { caseReference: '1234' },
      originalUrl: CASE_URL,
      session: { user: { accessToken: 'token' }, ...session },
      body,
    }) as unknown as Request;

  const inProgress = (answers: Record<string, unknown> = {}) => ({
    scheduleEvictions: { '1234': { start: START, eventToken: 'event-token', answers } },
  });

  const validAnswers = {
    dispenseWithService: 'NO',
    day: '1',
    month: '1',
    year: '2099',
    hour: '10',
    minute: '00',
  };

  beforeEach(() => {
    app = { get: jest.fn(), post: jest.fn() } as unknown as Application;
    res = {
      redirect: jest.fn(),
      render: jest.fn(),
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;
    scheduleEvictionRoutes(app);
  });

  afterEach(() => jest.clearAllMocks());

  it('starts the event and goes to the eviction details', async () => {
    (ccdCaseService.startCaseEvent as jest.Mock).mockResolvedValue({
      data: { sdkEventPayload: JSON.stringify(START) },
      eventToken: 'event-token',
    });
    const req = request({});

    await handler('get', '')(req, res, jest.fn());

    expect(req.session.scheduleEvictions!['1234'].eventToken).toBe('event-token');
    expect(res.redirect).toHaveBeenCalledWith(`${CASE_URL}/eviction-details`);
  });

  it('refuses the event when CCD sends no payload', async () => {
    (ccdCaseService.startCaseEvent as jest.Mock).mockResolvedValue({ data: {}, eventToken: 'event-token' });

    await handler('get', '')(request({}), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('shows the date error when no date is entered', () => {
    handler('post', '/eviction-details')(request(inProgress()), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(
      'schedule-eviction/eviction-details',
      expect.objectContaining({ errors: { date: DATE_REQUIRED } })
    );
  });

  it('goes to check your answers when the answers are complete', () => {
    const body = {
      'dispense-with-service': 'NO',
      'eviction-date-day': '1',
      'eviction-date-month': '1',
      'eviction-date-year': '2099',
      'eviction-date-hour': '10',
      'eviction-date-minute': '00',
    };

    handler('post', '/eviction-details')(request(inProgress(), body), res);

    expect(res.redirect).toHaveBeenCalledWith(`${CASE_URL}/check-your-answers`);
  });

  it('shows the eviction date on check your answers as ExUI shows dates', () => {
    handler('get', '/check-your-answers')(request(inProgress(validAnswers)), res);

    expect(res.render).toHaveBeenCalledWith(
      'schedule-eviction/check-your-answers',
      expect.objectContaining({ scheduledEviction: '1 Jan 2099, 10:00:00 AM' })
    );
  });

  it('goes back to the question on Previous', async () => {
    await handler('post', '/check-your-answers')(request(inProgress(validAnswers), { action: 'previous' }), res);

    expect(ccdCaseService.submitCaseEvent).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(`${CASE_URL}/eviction-details`);
  });

  it('shows an error on check your answers when the date has passed', async () => {
    const pastAnswers = { ...validAnswers, year: '2020' };

    await handler('post', '/check-your-answers')(request(inProgress(pastAnswers)), res, jest.fn());

    expect(ccdCaseService.submitCaseEvent).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith(
      'schedule-eviction/check-your-answers',
      expect.objectContaining({
        errorSummary: expect.objectContaining({
          errorList: [{ text: DATE_IN_PAST, href: '#schedule-eviction-answers' }],
        }),
      })
    );
  });

  it('submits the event and goes to the confirmation', async () => {
    (ccdCaseService.submitCaseEvent as jest.Mock).mockResolvedValue({});

    await handler('post', '/check-your-answers')(request(inProgress(validAnswers)), res, jest.fn());

    expect(ccdCaseService.submitCaseEvent).toHaveBeenCalledWith(
      'token',
      '1234',
      'ext:scheduleEviction',
      'event-token',
      {
        sdkEventPayload: JSON.stringify({
          enforcementApplicationId: 'app-1',
          courtGivenPermissionToDispenseWithService: 'NO',
          scheduledEvictionDate: '2099-01-01T10:00',
        }),
      }
    );
    expect(res.redirect).toHaveBeenCalledWith(`${CASE_URL}/confirmed`);
  });

  it('shows the reasons pcs-api refuses the event for on check your answers', async () => {
    (ccdCaseService.submitCaseEvent as jest.Mock).mockRejectedValue(
      new CallbackRejectedError(['The warrant has expired'], 422)
    );

    await handler('post', '/check-your-answers')(request(inProgress(validAnswers)), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.render).toHaveBeenCalledWith(
      'schedule-eviction/check-your-answers',
      expect.objectContaining({
        errorSummary: expect.objectContaining({
          errorList: [{ text: 'The warrant has expired', href: '#schedule-eviction-answers' }],
        }),
      })
    );
  });

  it('goes back to the case when there is nothing to confirm', () => {
    handler('get', '/confirmed')(request({}), res);

    expect(res.redirect).toHaveBeenCalledWith('/cases/case-details/1234');
  });
});
