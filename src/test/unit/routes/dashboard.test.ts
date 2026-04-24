import type { Application, NextFunction, Request, RequestHandler, Response } from 'express';
import type { Environment } from 'nunjucks';

import { oidcMiddleware } from '../../../main/middleware/oidc';
import { Logger } from '../../../main/modules/logger';

import dashboardRoutes, { getDashboardUrl } from '@routes/dashboard';
import { ccdCaseService } from '@services/ccdCaseService';

jest.mock('../../../main/modules/logger', () => {
  const errorFn = jest.fn();
  const warnFn = jest.fn();
  const loggerInstance = { error: errorFn, warn: warnFn };
  return {
    Logger: {
      getLogger: jest.fn(() => loggerInstance),
    },
  };
});

const mockRouterParam = jest.fn();
const mockRouterGet = jest.fn();
const mockRouterUse = jest.fn();

const mockRouter = {
  param: mockRouterParam,
  get: mockRouterGet,
  use: mockRouterUse,
};

/** Minimal `Request` for dashboard `/:caseReference` tests (handler only reads `params` + `session`). */
function dashboardCaseRequest(options: {
  caseReference: string | undefined;
  sessionUser: { accessToken?: string } | undefined;
}): Request {
  const { caseReference, sessionUser } = options;
  return {
    params: caseReference === undefined ? {} : { caseReference },
    session: { user: sessionUser },
  } as unknown as Request;
}

function getDashboardCaseHandler(): RequestHandler {
  const fn = mockRouterGet.mock.calls.find(call => call[0] === '/:caseReference')?.[1];
  if (typeof fn !== 'function') {
    throw new Error('Dashboard /:caseReference handler not registered');
  }
  return fn as RequestHandler;
}

jest.mock('express', () => {
  const actual = jest.requireActual('express');

  return {
    __esModule: true,
    ...actual,
    Router: jest.fn(() => mockRouter),
  };
});

jest.mock('config', () => ({
  get: jest.fn(() => 'mock-secret'),
  has: jest.fn(() => false),
}));
jest.mock('jose', () => ({
  decodeJwt: jest.fn(() => ({ exp: 0, sub: 'user-1' })),
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock-signed-token'),
  })),
}));

jest.mock('../../../main/middleware/oidc', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

const MISSING = '__MISSING_TRANSLATION__';

jest.mock('@modules/i18n', () => ({
  getTranslationFunction: jest.fn(() => {
    const strings: Record<string, string> = {
      'dashboard:taskGroups.CLAIM': 'Claim section',
      'dashboard:tasks.Defendant.ViewClaim.title': 'View claim title',
      'dashboard:tasks.Defendant.SubmitResponse.title': 'Submit response title',
      'dashboard:tasks.task-1.title': 'Task one title',
      'dashboard:tasks.statuses.AVAILABLE': 'Available',
      'dashboard:tasks.statuses.NOT_AVAILABLE': 'Not available',
      'dashboard:notifications.Defendant.CaseIssued.title': 'Case issued title',
      'dashboard:notifications.Defendant.CaseIssued.body': 'The claim has been issued to you.',
    };
    return ((key: string, opts?: { defaultValue?: string }) =>
      strings[key] ?? opts?.defaultValue ?? MISSING) as import('i18next').TFunction;
  }),
}));

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getDashboardView: jest.fn(),
  },
}));

describe('Dashboard Routes', () => {
  let app: Application;
  let logger: { error: jest.Mock; warn: jest.Mock };

  beforeEach(() => {
    mockRouterGet.mockClear();
    mockRouterParam.mockClear();
    mockRouterUse.mockClear();
    (ccdCaseService.getDashboardView as jest.Mock).mockResolvedValue({
      notifications: [
        {
          templateId: 'Defendant.CaseIssued',
          templateValues: {},
        },
      ],
      taskGroups: [
        {
          groupId: 'CLAIM',
          tasks: [
            { templateId: 'Defendant.ViewClaim', status: 'AVAILABLE' },
            { templateId: 'Defendant.SubmitResponse', status: 'NOT_AVAILABLE' },
          ],
        },
      ],
      propertyAddress: '10 Second Avenue, London, W3 7RX',
    });
    logger = (Logger.getLogger as jest.Mock)();
    logger.error.mockClear();
    logger.warn.mockClear();

    app = {
      locals: {
        nunjucksEnv: {
          render: jest.fn((template: string) => `<div>${template}</div>`),
        } as unknown as Environment,
      },
      use: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Router pattern and wiring', () => {
    it('should mount dashboard router with OIDC middleware only (no caseReference param)', () => {
      dashboardRoutes(app);

      expect(mockRouterUse).toHaveBeenCalledTimes(1);
      expect(mockRouterUse).toHaveBeenCalledWith(oidcMiddleware);
      expect(mockRouterParam).not.toHaveBeenCalled();
      expect((app.use as jest.Mock).mock.calls[0][0]).toBe('/dashboard');
      expect((app.use as jest.Mock).mock.calls[0][1]).toBe(mockRouter);
    });

    it('should render dashboard with notifications, task groups, and property address from getDashboardView', async () => {
      dashboardRoutes(app);

      const handler = getDashboardCaseHandler();

      const res = {
        render: jest.fn(),
      } as unknown as Response;

      const next: NextFunction = jest.fn();

      await handler(
        dashboardCaseRequest({
          caseReference: '1234567890123456',
          sessionUser: { accessToken: 'access-token-1' },
        }),
        res,
        next
      );

      expect(ccdCaseService.getDashboardView).toHaveBeenCalledWith('access-token-1', '1234567890123456');
      expect(next).not.toHaveBeenCalled();

      expect(res.render).toHaveBeenCalledWith(
        'dashboard',
        expect.objectContaining({
          propertyAddress: '10 Second Avenue, London, W3 7RX',
          dashboardCaseReference: '1234 5678 9012 3456',
          helpSupportLinks: expect.any(Array),
        })
      );

      const renderArgs = (res.render as jest.Mock).mock.calls[0][1] as {
        notifications: { title: string; body: string }[];
        taskGroups: {
          groupId: string;
          title: string;
          tasks: {
            title: { html: string };
            href?: string;
            status: { tag?: { text: string; classes: string } };
          }[];
        }[];
      };

      expect(renderArgs.notifications).toEqual([
        {
          title: 'Case issued title',
          body: 'The claim has been issued to you.',
        },
      ]);

      const [firstGroup] = renderArgs.taskGroups;
      expect(firstGroup.groupId).toBe('CLAIM');
      expect(firstGroup.title).toBe('Claim section');

      const [availableTask, notAvailableTask] = firstGroup.tasks;

      expect(availableTask.title.html).toBe('View claim title');
      expect(availableTask.href).toBe('/dashboard/1234567890123456/claim/Defendant.ViewClaim');
      expect(availableTask.status.tag?.text).toBe('Available');
      expect(availableTask.status.tag?.classes).toBe('govuk-tag--blue');

      expect(notAvailableTask.title.html).toBe('Submit response title');
      expect(notAvailableTask.href).toBeUndefined();
      expect(notAvailableTask.status).toEqual({});
    });

    it('should use config-driven route pattern for task href when configured', async () => {
      const configMock = jest.requireMock('config') as { has: jest.Mock; get: jest.Mock };
      configMock.has.mockImplementation((key: string) => key === 'dashboard.taskRoutes');
      configMock.get.mockImplementation((key: string) =>
        key === 'dashboard.taskRoutes' ? { 'task-1': '/case/:caseReference/task-one' } : 'mock-secret'
      );

      (ccdCaseService.getDashboardView as jest.Mock).mockResolvedValueOnce({
        notifications: [],
        taskGroups: [
          {
            groupId: 'CLAIM',
            tasks: [{ templateId: 'task-1', status: 'AVAILABLE' }],
          },
        ],
        propertyAddress: null,
      });

      dashboardRoutes(app);

      const handler = getDashboardCaseHandler();

      const res = { render: jest.fn() } as unknown as Response;
      const next: NextFunction = jest.fn();

      await handler(
        dashboardCaseRequest({
          caseReference: '1234567890123456',
          sessionUser: { accessToken: 'access-token-1' },
        }),
        res,
        next
      );

      const renderArgs = (res.render as jest.Mock).mock.calls[0][1] as {
        taskGroups: { tasks: { href?: string }[] }[];
      };
      const [configuredTask] = renderArgs.taskGroups[0].tasks;

      expect(configuredTask.href).toBe('/case/1234567890123456/task-one');
    });

    it('should fall back to default task href when config taskRoutes value is not an object', async () => {
      const configMock = jest.requireMock('config') as { has: jest.Mock; get: jest.Mock };
      configMock.has.mockImplementation((key: string) => key === 'dashboard.taskRoutes');
      configMock.get.mockImplementation((key: string) =>
        key === 'dashboard.taskRoutes' ? 'not-an-object' : 'mock-secret'
      );

      (ccdCaseService.getDashboardView as jest.Mock).mockResolvedValueOnce({
        notifications: [],
        taskGroups: [
          {
            groupId: 'GROUP_ONE',
            tasks: [{ templateId: 'task-1', status: 'AVAILABLE' }],
          },
        ],
        propertyAddress: null,
      });

      dashboardRoutes(app);

      const handler = getDashboardCaseHandler();

      const res = { render: jest.fn() } as unknown as Response;
      const next: NextFunction = jest.fn();

      await handler(
        dashboardCaseRequest({
          caseReference: '1234567890123456',
          sessionUser: { accessToken: 'access-token-1' },
        }),
        res,
        next
      );

      const renderArgs = (res.render as jest.Mock).mock.calls[0][1] as {
        taskGroups: { tasks: { href?: string }[] }[];
      };
      const [task] = renderArgs.taskGroups[0].tasks;

      expect(task.href).toBe('/dashboard/1234567890123456/group_one/task-1');
    });

    it('should omit notifications when translation is missing and log a warning', async () => {
      (ccdCaseService.getDashboardView as jest.Mock).mockResolvedValueOnce({
        notifications: [{ templateId: 'Defendant.UnknownNotice', templateValues: {} }],
        taskGroups: [],
        propertyAddress: null,
      });

      dashboardRoutes(app);

      const handler = getDashboardCaseHandler();

      const res = { render: jest.fn() } as unknown as Response;
      const next: NextFunction = jest.fn();
      await handler(
        dashboardCaseRequest({
          caseReference: '1234567890123456',
          sessionUser: { accessToken: 't' },
        }),
        res,
        next
      );

      const renderArgs = (res.render as jest.Mock).mock.calls[0][1] as { notifications: unknown[] };
      expect(renderArgs.notifications).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        'No dashboard translation for notification templateId=Defendant.UnknownNotice'
      );
    });

    it('should pass errors to next when dashboard data fetch fails', async () => {
      const failure = new Error('API failure');
      (ccdCaseService.getDashboardView as jest.Mock).mockRejectedValueOnce(failure);

      dashboardRoutes(app);

      const handler = getDashboardCaseHandler();

      const res = {
        render: jest.fn(),
      } as unknown as Response;

      const next: NextFunction = jest.fn();

      await handler(
        dashboardCaseRequest({
          caseReference: '1234567890123456',
          sessionUser: { accessToken: 't' },
        }),
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(failure);
      expect(res.render).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch dashboard data for case 1234567890123456. Error was: Error: API failure'
      );
    });

    it('should return 404 when case reference is invalid', async () => {
      dashboardRoutes(app);
      const handler = getDashboardCaseHandler();

      const next: NextFunction = jest.fn();
      await handler(
        dashboardCaseRequest({
          caseReference: 'not-a-case-ref',
          sessionUser: { accessToken: 't' },
        }),
        { render: jest.fn() } as unknown as Response,
        next
      );

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid case reference format' }));
      expect(ccdCaseService.getDashboardView).not.toHaveBeenCalled();
    });

    it('should return 401 when access token is missing', async () => {
      dashboardRoutes(app);
      const handler = getDashboardCaseHandler();

      const next: NextFunction = jest.fn();
      await handler(
        dashboardCaseRequest({
          caseReference: '1234567890123456',
          sessionUser: {},
        }),
        { render: jest.fn() } as unknown as Response,
        next
      );

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Authentication required' }));
      expect(ccdCaseService.getDashboardView).not.toHaveBeenCalled();
    });
  });

  describe('getDashboardUrl helper', () => {
    it('should return dashboard URL with valid 16-digit case reference', () => {
      const result = getDashboardUrl('1234567890123456');
      expect(result).toBe('/dashboard/1234567890123456');
    });

    it('should return null for invalid case reference', () => {
      const result = getDashboardUrl('invalid');
      expect(result).toBeNull();
    });

    it('should return null when case reference is undefined', () => {
      const result = getDashboardUrl(undefined);
      expect(result).toBeNull();
    });

    it('should handle numeric case IDs', () => {
      const result = getDashboardUrl(1771325608502536);
      expect(result).toBe('/dashboard/1771325608502536');
    });
  });
});
