import { Logger } from '@hmcts/nodejs-logging';
import { Application } from 'express';

import dashboardRoute from '../../../main/routes/dashboard';
import { getDashboardNotifications } from '../../../main/services/pcsApi';
import { oidcMiddleware } from '../../../main/middleware';

jest.mock('../../../main/services/pcsApi');
jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn().mockReturnValue({
      error: jest.fn(),
    }),
  },
}));

describe('Dashboard Route', () => {
  let mockApp: Application;
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
    } as unknown as Application;

    // Reset all mocks
    jest.clearAllMocks();
    (Logger.getLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  it('should register the dashboard route', () => {
    dashboardRoute(mockApp);
    expect(mockGet).toHaveBeenCalledWith('/dashboard/:caseReference', oidcMiddleware, expect.any(Function));
  });

  describe('GET /dashboard/:caseReference', () => {
    let mockReq: {
      params: {
        caseReference: string;
      };
      session?: {
        user?: any;
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
          user: {} // Add mock user to session to pass oidcMiddleware
        }
      };

      mockRes = {
        render: mockRender,
        redirect: jest.fn()
      };

      mockNext = jest.fn();
    });

    it('should render dashboard with notifications when successful', async () => {
      const mockNotifications = [
        { id: 1, message: 'Test notification 1' },
        { id: 2, message: 'Test notification 2' },
      ];

      (getDashboardNotifications as jest.Mock).mockResolvedValue(mockNotifications);

      dashboardRoute(mockApp);
      const routeHandler = mockGet.mock.calls[0][2]; // Changed index to 2 to get the route handler after middleware
      await routeHandler(mockReq, mockRes, mockNext);

      expect(getDashboardNotifications).toHaveBeenCalledWith(12345);
      expect(mockRender).toHaveBeenCalledWith('dashboard', {
        notifications: mockNotifications,
      });
    });

    it('should handle errors when fetching notifications fails', async () => {
      const mockError = new Error('Failed to fetch notifications');
      (getDashboardNotifications as jest.Mock).mockRejectedValue(mockError);

      dashboardRoute(mockApp);
      const routeHandler = mockGet.mock.calls[0][2];
      
      await expect(routeHandler(mockReq, mockRes, mockNext)).rejects.toThrow('Failed to fetch notifications');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch notifications for case 12345')
      );
    });

    it('should handle invalid case reference parameter', async () => {
      mockReq.params.caseReference = 'invalid';

      dashboardRoute(mockApp);
      const routeHandler = mockGet.mock.calls[0][2];
      
      await expect(routeHandler(mockReq, mockRes, mockNext)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch notifications for case NaN')
      );
    });
  });
});
