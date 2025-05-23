import { Logger } from '@hmcts/nodejs-logging';
import { Application } from 'express';
import { Environment } from 'nunjucks';

import { oidcMiddleware } from '../../../main/middleware';
import dashboardRoute from '../../../main/routes/dashboard';
import { getDashboardNotifications, getDashboardTaskGroups } from '../../../main/services/pcsApi';

jest.mock('../../../main/services/pcsApi');
jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn().mockReturnValue({
      error: jest.fn(),
    }),
  },
}));

interface MockNunjucksEnv extends Partial<Environment> {
  render: jest.Mock;
}

type MockApp = {
  get: jest.Mock;
  locals: {
    nunjucksEnv?: MockNunjucksEnv;
  };
};

describe('Dashboard Route', () => {
  let mockApp: MockApp;
  let mockGet: jest.Mock;
  let mockRender: jest.Mock;
  let mockLogger: {
    error: jest.Mock;
  };

  beforeEach(() => {
    mockGet = jest.fn();
    mockRender = jest.fn();
    mockLogger = {
      error: jest.fn(),
    };

    mockApp = {
      get: mockGet,
      locals: {
        nunjucksEnv: {
          render: jest.fn().mockImplementation(template => `Rendered ${template}`),
        },
      },
    };

    // Reset all mocks
    jest.clearAllMocks();
    (Logger.getLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  it('should register the dashboard route', () => {
    dashboardRoute(mockApp as unknown as Application);
    expect(mockGet).toHaveBeenCalledWith('/dashboard/:caseReference', oidcMiddleware, expect.any(Function));
  });

  describe('GET /dashboard/:caseReference', () => {
    let mockReq: {
      params: {
        caseReference: string;
      };
      session?: {
        user?: unknown;
      };
    };
    let mockRes: {
      render: jest.Mock;
      redirect: jest.Mock;
    };
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {
        params: {
          caseReference: '12345',
        },
        session: {
          user: {}, // Add mock user to session to pass oidcMiddleware
        },
      };

      mockRes = {
        render: mockRender,
        redirect: jest.fn(),
      };

      mockNext = jest.fn();
    });

    it('should render dashboard with notifications and task groups when successful', async () => {
      const mockNotifications = [
        { id: 1, message: 'Test notification 1' },
        { id: 2, message: 'Test notification 2' },
      ];

      const mockTaskGroups = [
        {
          groupId: 'GROUP1',
          tasks: [
            {
              templateId: 'task1',
              status: 'AVAILABLE',
              templateValues: {
                dueDate: '2024-05-13',
              },
            },
          ],
        },
      ];

      (getDashboardNotifications as jest.Mock).mockResolvedValue(mockNotifications);
      (getDashboardTaskGroups as jest.Mock).mockResolvedValue(mockTaskGroups);

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      await routeHandler(mockReq, mockRes, mockNext);

      expect(getDashboardNotifications).toHaveBeenCalledWith(12345);
      expect(getDashboardTaskGroups).toHaveBeenCalledWith(12345);
      expect(mockRender).toHaveBeenCalledWith('dashboard', {
        notifications: mockNotifications,
        taskGroups: [
          {
            groupId: 'GROUP1',
            title: undefined,
            tasks: [
              {
                hint: {
                  html: 'Rendered components/taskGroup/group1/task1-hint.njk',
                },
                href: '12345/group1/task1',
                status: {
                  tag: { text: 'Available', classes: 'govuk-tag--blue' },
                },
                title: {
                  html: 'Rendered components/taskGroup/group1/task1.njk',
                },
              },
            ],
          },
        ],
      });
    });

    it('should handle tasks with different statuses and template values', async () => {
      const mockTaskGroups = [
        {
          groupId: 'GROUP1',
          tasks: [
            {
              templateId: 'task1',
              status: 'AVAILABLE',
              templateValues: {
                dueDate: '2024-05-13',
              },
            },
            {
              templateId: 'task2',
              status: 'IN_PROGRESS',
              templateValues: {
                deadline: '2024-05-14',
              },
            },
            {
              templateId: 'task3',
              status: 'NOT_AVAILABLE',
              templateValues: {},
            },
          ],
        },
      ];

      (getDashboardNotifications as jest.Mock).mockResolvedValue([]);
      (getDashboardTaskGroups as jest.Mock).mockResolvedValue(mockTaskGroups);

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      await routeHandler(mockReq, mockRes, mockNext);

      expect(mockRender).toHaveBeenCalledWith('dashboard', {
        notifications: [],
        taskGroups: [
          {
            groupId: 'GROUP1',
            title: undefined,
            tasks: [
              {
                hint: {
                  html: 'Rendered components/taskGroup/group1/task1-hint.njk',
                },
                href: '12345/group1/task1',
                status: {
                  tag: { text: 'Available', classes: 'govuk-tag--blue' },
                },
                title: {
                  html: 'Rendered components/taskGroup/group1/task1.njk',
                },
              },
              {
                hint: {
                  html: 'Rendered components/taskGroup/group1/task2-hint.njk',
                },
                href: '12345/group1/task2',
                status: {
                  tag: { text: 'In progress', classes: 'govuk-tag--yellow' },
                },
                title: {
                  html: 'Rendered components/taskGroup/group1/task2.njk',
                },
              },
              {
                hint: undefined,
                href: undefined,
                status: {
                  tag: { text: 'Not available yet', classes: 'govuk-tag--grey' },
                },
                title: {
                  html: 'Rendered components/taskGroup/group1/task3.njk',
                },
              },
            ],
          },
        ],
      });
    });

    it('should throw error when nunjucks environment is not initialized', async () => {
      const mockTaskGroups = [
        {
          groupId: 'GROUP1',
          tasks: [
            {
              templateId: 'task1',
              status: 'AVAILABLE',
              templateValues: {
                dueDate: '2024-05-13',
              },
            },
          ],
        },
      ];

      (getDashboardNotifications as jest.Mock).mockResolvedValue([]);
      (getDashboardTaskGroups as jest.Mock).mockResolvedValue(mockTaskGroups);

      // Remove nunjucksEnv from app.locals
      delete mockApp.locals.nunjucksEnv;

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];

      await expect(routeHandler(mockReq, mockRes, mockNext)).rejects.toThrow('Nunjucks environment not initialized');
    });

    it('should handle errors when fetching data fails', async () => {
      const mockError = new Error('Failed to fetch data');
      (getDashboardNotifications as jest.Mock).mockRejectedValue(mockError);

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];

      await expect(routeHandler(mockReq, mockRes, mockNext)).rejects.toThrow('Failed to fetch data');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch dashboard data for case 12345')
      );
    });

    it('should handle invalid case reference parameter', async () => {
      mockReq.params.caseReference = 'invalid';

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];

      await expect(routeHandler(mockReq, mockRes, mockNext)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch dashboard data for case NaN')
      );
    });
  });
});
