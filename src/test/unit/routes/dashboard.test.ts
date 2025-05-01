import { Logger } from '@hmcts/nodejs-logging';
import { Application } from 'express';

import dashboardRoute from '../../../main/routes/dashboard';
import { getDashboardNotifications } from '../../../main/services/pcsApi';

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

  beforeEach(() => {
    mockGet = jest.fn();
    mockRender = jest.fn();

    mockApp = {
      get: mockGet,
    } as unknown as Application;

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should register the dashboard route', () => {
    dashboardRoute(mockApp);
    expect(mockGet).toHaveBeenCalledWith('/dashboard/:caseReference', expect.any(Function));
  });

  describe('GET /dashboard/:caseReference', () => {
    let mockReq: any;
    let mockRes: any;
    let mockLogger: any;

    beforeEach(() => {
      mockReq = {
        params: {
          caseReference: '12345',
        },
      };

      mockRes = {
        render: mockRender,
      };

      mockLogger = Logger.getLogger('dashboard');
    });

    it('should render dashboard with notifications when successful', async () => {
      const mockNotifications = [
        { id: 1, message: 'Test notification 1' },
        { id: 2, message: 'Test notification 2' },
      ];

      (getDashboardNotifications as jest.Mock).mockResolvedValue(mockNotifications);

      dashboardRoute(mockApp);
      const routeHandler = mockGet.mock.calls[0][1];
      await routeHandler(mockReq, mockRes);

      expect(getDashboardNotifications).toHaveBeenCalledWith(12345);
      expect(mockRender).toHaveBeenCalledWith('dashboard', {
        notifications: mockNotifications,
      });
    });

    it('should handle errors when fetching notifications fails', async () => {
      const mockError = new Error('Failed to fetch notifications');
      (getDashboardNotifications as jest.Mock).mockRejectedValue(mockError);

      dashboardRoute(mockApp);
      const routeHandler = mockGet.mock.calls[0][1];

      await expect(routeHandler(mockReq, mockRes)).rejects.toThrow(mockError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch notifications for case 12345')
      );
    });

    it('should handle invalid case reference parameter', async () => {
      mockReq.params.caseReference = 'invalid';

      dashboardRoute(mockApp);
      const routeHandler = mockGet.mock.calls[0][1];

      await expect(routeHandler(mockReq, mockRes)).rejects.toThrow();
      expect(getDashboardNotifications).toHaveBeenCalledWith(NaN);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch notifications for case NaN')
      );
    });
  });
});
