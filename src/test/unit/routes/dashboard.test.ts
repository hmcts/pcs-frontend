import type { Application, Response } from 'express';
import type { Environment } from 'nunjucks';

import * as caseReferenceMiddleware from '../../../main/middleware/caseReference';
import { Logger } from '../../../main/modules/logger';
import { getDashboardNotifications, getDashboardTaskGroups } from '../../../main/services/pcsApi';

import dashboardRoutes, { getDashboardUrl } from '@routes/dashboard';

jest.mock('../../../main/modules/logger', () => {
  const errorFn = jest.fn();
  const loggerInstance = { error: errorFn };
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

jest.mock('express', () => {
  const actual = jest.requireActual('express');

  return {
    __esModule: true,
    ...actual,
    Router: jest.fn(() => mockRouter),
  };
});

jest.mock('../../../main/middleware/caseReference', () => ({
  caseReferenceParamMiddleware: jest.fn((req, res, next, caseReference) => {
    // Simulate validatedCase being set by middleware so dashboard route can use it
    res.locals.validatedCase = {
      id: caseReference,
      data: {
        propertyAddress: {
          AddressLine1: '10 Second Avenue',
          AddressLine2: '',
          AddressLine3: '',
          PostTown: 'London',
          County: '',
          PostCode: 'W3 7RX',
        },
      },
    };

    return next();
  }),
}));

jest.mock('../../../main/middleware/caseReference');
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

jest.mock('../../../main/services/pcsApi', () => {
  const STATUS_MAP = {
    AVAILABLE: { text: 'Available' },
    NOT_AVAILABLE: { text: 'Not available' },
  };

  const TASK_GROUP_MAP = {
    GROUP_ONE: 'Group one title',
  };

  return {
    STATUS_MAP,
    TASK_GROUP_MAP,
    getDashboardNotifications: jest.fn().mockResolvedValue([]),
    getDashboardTaskGroups: jest.fn().mockResolvedValue([
      {
        groupId: 'GROUP_ONE',
        tasks: [
          {
            templateId: 'task-1',
            templateValues: { dueDate: '2025-01-01' },
            status: 'AVAILABLE',
          },
          {
            templateId: 'task-2',
            templateValues: {},
            status: 'NOT_AVAILABLE',
          },
        ],
      },
    ]),
  };
});

describe('Dashboard Routes', () => {
  let app: Application;
  let logger: { error: jest.Mock };

  beforeEach(() => {
    mockRouterGet.mockClear();
    mockRouterParam.mockClear();
    mockRouterUse.mockClear();
    (getDashboardNotifications as jest.Mock).mockClear();
    (getDashboardTaskGroups as jest.Mock).mockClear();
    logger = (Logger.getLogger as jest.Mock)();
    logger.error.mockClear();

    // Reset config mock to defaults so implementations don't leak between tests
    const configMock = jest.requireMock('config') as { has: jest.Mock; get: jest.Mock };
    configMock.has.mockReturnValue(false);
    configMock.get.mockReturnValue('mock-secret');

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
    it('should create dashboard router with param middleware', () => {
      dashboardRoutes(app);

      expect(mockRouterUse).toHaveBeenCalledTimes(1);
      expect(mockRouterParam).toHaveBeenCalledWith(
        'caseReference',
        caseReferenceMiddleware.caseReferenceParamMiddleware
      );
      expect((app.use as jest.Mock).mock.calls[0][0]).toBe('/dashboard');
      expect((app.use as jest.Mock).mock.calls[0][1]).toBe(mockRouter);
    });

    it('should render dashboard view with mapped task groups', async () => {
      dashboardRoutes(app);

      const handler = mockRouterGet.mock.calls.find(call => call[0] === '/:caseReference')?.[1] as (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req: any,
        res: Response
      ) => Promise<void>;

      const res = {
        locals: {
          validatedCase: {
            id: '1234567890123456',
            data: {
              propertyAddress: {
                AddressLine1: '10 Second Avenue',
                AddressLine2: '',
                AddressLine3: '',
                PostTown: 'London',
                County: '',
                PostCode: 'W3 7RX',
              },
            },
          },
        },
        render: jest.fn(),
      } as unknown as Response;

      await handler({}, res);

      expect(getDashboardNotifications).toHaveBeenCalledWith(1234567890123456);
      expect(getDashboardTaskGroups).toHaveBeenCalledWith(1234567890123456);

      expect(res.render).toHaveBeenCalledWith(
        'dashboard',
        expect.objectContaining({
          propertyAddress: '10 Second Avenue, London, W3 7RX',
          dashboardCaseReference: '1234 5678 9012 3456',
        })
      );

      const renderArgs = (res.render as jest.Mock).mock.calls[0][1] as {
        taskGroups: {
          title: string;
          tasks: {
            title: { html: string };
            hint?: { html: string };
            href?: string;
            status: unknown;
          }[];
        }[];
      };

      const [firstGroup] = renderArgs.taskGroups;
      expect(firstGroup.title).toBe('Group one title');

      const [availableTask, notAvailableTask] = firstGroup.tasks;

      expect(availableTask.title.html).toContain('dashboard:tasks.task-1.title');
      expect(availableTask.hint?.html).toContain('components/taskGroup/group_one/task-1-hint.njk');
      expect(availableTask.href).toBe('/dashboard/1234567890123456/group_one/task-1');

      expect(notAvailableTask.hint).toBeUndefined();
      expect(notAvailableTask.href).toBeUndefined();
    });

    it('should apply task status override from config, activating a previously unavailable task', async () => {
      const configMock = jest.requireMock('config') as { has: jest.Mock; get: jest.Mock };
      configMock.has.mockImplementation((key: string) => key === 'dashboard.taskStatusOverrides');
      configMock.get.mockImplementation((key: string) =>
        key === 'dashboard.taskStatusOverrides' ? { 'task-2': 'AVAILABLE' } : 'mock-secret'
      );

      dashboardRoutes(app);

      const handler = mockRouterGet.mock.calls.find(call => call[0] === '/:caseReference')?.[1] as (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req: any,
        res: Response
      ) => Promise<void>;

      const res = {
        locals: {
          validatedCase: { id: '1234567890123456', data: {} },
        },
        render: jest.fn(),
      } as unknown as Response;

      await handler({}, res);

      const renderArgs = (res.render as jest.Mock).mock.calls[0][1] as {
        taskGroups: { tasks: { href?: string; status: unknown }[] }[];
      };
      const [, overriddenTask] = renderArgs.taskGroups[0].tasks;

      // task-2 was NOT_AVAILABLE from the API but the config override forces AVAILABLE,
      // so it should now have an active href and the Available status
      expect(overriddenTask.href).toBe('/dashboard/1234567890123456/group_one/task-2');
      expect(overriddenTask.status).toEqual({ text: 'Available' });
    });

    it('should use config-driven route pattern for task href when configured', async () => {
      const configMock = jest.requireMock('config') as { has: jest.Mock; get: jest.Mock };
      configMock.has.mockImplementation((key: string) => key === 'dashboard.taskRoutes');
      configMock.get.mockImplementation((key: string) =>
        key === 'dashboard.taskRoutes'
          ? { 'task-1': '/case/:caseReference/task-one' }
          : 'mock-secret'
      );

      dashboardRoutes(app);

      const handler = mockRouterGet.mock.calls.find(call => call[0] === '/:caseReference')?.[1] as (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req: any,
        res: Response
      ) => Promise<void>;

      const res = {
        locals: {
          validatedCase: { id: '1234567890123456', data: {} },
        },
        render: jest.fn(),
      } as unknown as Response;

      await handler({}, res);

      const renderArgs = (res.render as jest.Mock).mock.calls[0][1] as {
        taskGroups: { tasks: { href?: string }[] }[];
      };
      const [configuredTask] = renderArgs.taskGroups[0].tasks;

      // task-1 has a config-driven route pattern, so :caseReference should be substituted
      expect(configuredTask.href).toBe('/case/1234567890123456/task-one');
    });

    it('should log and rethrow when dashboard data fetch fails', async () => {
      (getDashboardTaskGroups as jest.Mock).mockRejectedValueOnce(new Error('API failure'));

      dashboardRoutes(app);

      const handler = mockRouterGet.mock.calls.find(call => call[0] === '/:caseReference')?.[1] as (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req: any,
        res: Response
      ) => Promise<void>;

      const res = {
        locals: {
          validatedCase: {
            id: '1234567890123456',
            data: {},
          },
        },
      } as unknown as Response;

      await expect(handler({}, res)).rejects.toThrow('API failure');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch dashboard data for case 1234567890123456. Error was: Error: API failure'
      );
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
