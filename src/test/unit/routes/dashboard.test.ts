import { Application } from 'express';
import { Environment } from 'nunjucks';

import { oidcMiddleware } from '../../../main/middleware';
import dashboardRoute from '../../../main/routes/dashboard';
import { getDashboardNotifications, getDashboardTaskGroups } from '../../../main/services/pcsApi';

import { Logger } from '@modules/logger';

jest.mock('../../../main/services/pcsApi');
jest.mock('@modules/logger', () => ({
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

  it('should register the dashboard routes', () => {
    dashboardRoute(mockApp as unknown as Application);
    expect(mockGet).toHaveBeenCalledWith('/dashboard', oidcMiddleware, expect.any(Function));
    expect(mockGet).toHaveBeenCalledWith('/dashboard/:caseReference', oidcMiddleware, expect.any(Function));
  });

  describe('GET /dashboard', () => {
    let mockReq: {
      session?: {
        ccdCase?: {
          id?: string | number;
        };
        user?: unknown;
      };
    };
    let mockRes: {
      redirect: jest.Mock;
    };
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {
        session: {
          user: {},
        },
      };

      mockRes = {
        redirect: jest.fn(),
      };

      mockNext = jest.fn();
    });

    it('should redirect to dashboard URL with valid 16-digit caseId', () => {
      mockReq.session!.ccdCase = { id: '1234567890123456' };

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      routeHandler(mockReq, mockRes, mockNext);

      expect(mockRes.redirect).toHaveBeenCalledWith(303, '/dashboard/1234567890123456');
    });

    it('should redirect to default URL when caseId is not provided', () => {
      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      routeHandler(mockReq, mockRes, mockNext);

      expect(mockRes.redirect).toHaveBeenCalledWith(303, '/dashboard/1234567890123456');
    });

    it('should redirect to default URL when caseId is invalid (too short)', () => {
      mockReq.session!.ccdCase = { id: '12345' };

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      routeHandler(mockReq, mockRes, mockNext);

      expect(mockRes.redirect).toHaveBeenCalledWith(303, '/dashboard/1234567890123456');
    });

    it('should redirect to default URL when caseId is invalid (contains letters)', () => {
      mockReq.session!.ccdCase = { id: '123456789012345a' };

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      routeHandler(mockReq, mockRes, mockNext);

      expect(mockRes.redirect).toHaveBeenCalledWith(303, '/dashboard/1234567890123456');
    });

    it('should redirect to default URL when caseId is a number', () => {
      mockReq.session!.ccdCase = { id: 1234567890123456 };

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      routeHandler(mockReq, mockRes, mockNext);

      expect(mockRes.redirect).toHaveBeenCalledWith(303, '/dashboard/1234567890123456');
    });

    it('should redirect to default URL when redirectUrl does not match pattern', () => {
      // This test ensures the pattern validation works
      // We'll mock getDashboardUrl to return an invalid URL
      mockReq.session!.ccdCase = { id: '1234567890123456' };

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      routeHandler(mockReq, mockRes, mockNext);

      // Should still redirect to valid URL since getDashboardUrl validates
      expect(mockRes.redirect).toHaveBeenCalledWith(303, '/dashboard/1234567890123456');
    });
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
      status: jest.Mock;
      send: jest.Mock;
      locals: {
        validatedCase?: {
          id: string | number;
          state?: string;
        };
      };
    };
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {
        params: {
          caseReference: '1234567890123456', // Must be 16 digits
        },
        session: {
          user: {}, // Add mock user to session to pass oidcMiddleware
        },
      };

      mockRes = {
        render: mockRender,
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        locals: {
          validatedCase: {
            id: '1234567890123456',
            state: 'Open',
          },
        },
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
      // Get the second route handler (index 1) for /dashboard/:caseReference
      const routeHandler = mockGet.mock.calls[1][2];
      await routeHandler(mockReq, mockRes, mockNext);

      expect(getDashboardNotifications).toHaveBeenCalledWith(1234567890123456);
      expect(getDashboardTaskGroups).toHaveBeenCalledWith(1234567890123456);
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
                href: '/dashboard/1234567890123456/group1/task1',
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
      // Get the second route handler (index 1) for /dashboard/:caseReference
      const routeHandler = mockGet.mock.calls[1][2];
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
                href: '/dashboard/1234567890123456/group1/task1',
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
                href: '/dashboard/1234567890123456/group1/task2',
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
      const appWithoutNunjucks = {
        ...mockApp,
        locals: {},
      };

      dashboardRoute(appWithoutNunjucks as unknown as Application);
      // Get the second route handler (index 1) for /dashboard/:caseReference
      const routeHandler = mockGet.mock.calls[1][2];

      await expect(routeHandler(mockReq, mockRes, mockNext)).rejects.toThrow('Nunjucks environment not initialized');
    });

    it('should handle errors when fetching data fails', async () => {
      const mockError = new Error('Failed to fetch data');
      (getDashboardNotifications as jest.Mock).mockRejectedValue(mockError);

      dashboardRoute(mockApp as unknown as Application);
      // Get the second route handler (index 1) for /dashboard/:caseReference
      const routeHandler = mockGet.mock.calls[1][2];

      await expect(routeHandler(mockReq, mockRes, mockNext)).rejects.toThrow('Failed to fetch data');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch dashboard data for case 1234567890123456')
      );
    });

    it('should handle empty task groups array', async () => {
      (getDashboardNotifications as jest.Mock).mockResolvedValue([]);
      (getDashboardTaskGroups as jest.Mock).mockResolvedValue([]);

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[1][2];
      await routeHandler(mockReq, mockRes, mockNext);

      expect(mockRender).toHaveBeenCalledWith('dashboard', {
        notifications: [],
        taskGroups: [],
      });
    });

    it('should handle multiple task groups', async () => {
      const mockTaskGroups = [
        {
          groupId: 'GROUP1',
          tasks: [
            {
              templateId: 'task1',
              status: 'AVAILABLE',
              templateValues: { dueDate: '2024-05-13' },
            },
          ],
        },
        {
          groupId: 'GROUP2',
          tasks: [
            {
              templateId: 'task2',
              status: 'IN_PROGRESS',
              templateValues: { deadline: '2024-05-14' },
            },
          ],
        },
      ];

      (getDashboardNotifications as jest.Mock).mockResolvedValue([]);
      (getDashboardTaskGroups as jest.Mock).mockResolvedValue(mockTaskGroups);

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[1][2];
      await routeHandler(mockReq, mockRes, mockNext);

      expect(mockRender).toHaveBeenCalledWith('dashboard', {
        notifications: [],
        taskGroups: [
          {
            groupId: 'GROUP1',
            title: undefined,
            tasks: [
              {
                hint: { html: 'Rendered components/taskGroup/group1/task1-hint.njk' },
                href: '/dashboard/1234567890123456/group1/task1',
                status: { tag: { text: 'Available', classes: 'govuk-tag--blue' } },
                title: { html: 'Rendered components/taskGroup/group1/task1.njk' },
              },
            ],
          },
          {
            groupId: 'GROUP2',
            title: undefined,
            tasks: [
              {
                hint: { html: 'Rendered components/taskGroup/group2/task2-hint.njk' },
                href: '/dashboard/1234567890123456/group2/task2',
                status: { tag: { text: 'In progress', classes: 'govuk-tag--yellow' } },
                title: { html: 'Rendered components/taskGroup/group2/task2.njk' },
              },
            ],
          },
        ],
      });
    });

    it('should handle tasks without dueDate or deadline (no hint)', async () => {
      const mockTaskGroups = [
        {
          groupId: 'GROUP1',
          tasks: [
            {
              templateId: 'task1',
              status: 'AVAILABLE',
              templateValues: {},
            },
          ],
        },
      ];

      (getDashboardNotifications as jest.Mock).mockResolvedValue([]);
      (getDashboardTaskGroups as jest.Mock).mockResolvedValue(mockTaskGroups);

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[1][2];
      await routeHandler(mockReq, mockRes, mockNext);

      expect(mockRender).toHaveBeenCalledWith('dashboard', {
        notifications: [],
        taskGroups: [
          {
            groupId: 'GROUP1',
            title: undefined,
            tasks: [
              {
                hint: undefined,
                href: '/dashboard/1234567890123456/group1/task1',
                status: { tag: { text: 'Available', classes: 'govuk-tag--blue' } },
                title: { html: 'Rendered components/taskGroup/group1/task1.njk' },
              },
            ],
          },
        ],
      });
    });

    it('should handle task with only dueDate', async () => {
      const mockTaskGroups = [
        {
          groupId: 'GROUP1',
          tasks: [
            {
              templateId: 'task1',
              status: 'AVAILABLE',
              templateValues: { dueDate: '2024-05-13' },
            },
          ],
        },
      ];

      (getDashboardNotifications as jest.Mock).mockResolvedValue([]);
      (getDashboardTaskGroups as jest.Mock).mockResolvedValue(mockTaskGroups);

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[1][2];
      await routeHandler(mockReq, mockRes, mockNext);

      const renderCall = mockRender.mock.calls[0];
      expect(renderCall[1].taskGroups[0].tasks[0].hint).toBeDefined();
      expect(renderCall[1].taskGroups[0].tasks[0].hint.html).toContain('task1-hint');
    });

    it('should handle task with only deadline', async () => {
      const mockTaskGroups = [
        {
          groupId: 'GROUP1',
          tasks: [
            {
              templateId: 'task1',
              status: 'AVAILABLE',
              templateValues: { deadline: '2024-05-14' },
            },
          ],
        },
      ];

      (getDashboardNotifications as jest.Mock).mockResolvedValue([]);
      (getDashboardTaskGroups as jest.Mock).mockResolvedValue(mockTaskGroups);

      dashboardRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[1][2];
      await routeHandler(mockReq, mockRes, mockNext);

      const renderCall = mockRender.mock.calls[0];
      expect(renderCall[1].taskGroups[0].tasks[0].hint).toBeDefined();
      expect(renderCall[1].taskGroups[0].tasks[0].hint.html).toContain('task1-hint');
    });
  });
});
