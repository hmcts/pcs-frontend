import { Application } from 'express';

import { oidcMiddleware } from '../../../main/middleware';
import homeRoute from '../../../main/routes/home';
import { getRootGreeting } from '../../../main/services/pcsApi/pcsApiService';

jest.mock('../../../main/services/pcsApi/pcsApiService');
jest.mock('../../../main/middleware');

describe('Home Route', () => {
  let mockApp: {
    get: jest.Mock;
  };
  let mockRender: jest.Mock;

  beforeEach(() => {
    mockRender = jest.fn();

    mockApp = {
      get: jest.fn(),
    };

    jest.clearAllMocks();

    (oidcMiddleware as jest.Mock).mockImplementation((req, res, next) => next());
  });

  it('should register GET / route with oidcMiddleware', () => {
    homeRoute(mockApp as unknown as Application);
    expect(mockApp.get).toHaveBeenCalledWith('/', oidcMiddleware, expect.any(Function));
  });

  describe('GET / handler', () => {
    let routeHandler: Function;
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
      homeRoute(mockApp as unknown as Application);
      routeHandler = mockApp.get.mock.calls[0][2];

      mockReq = {
        session: {
          user: {
            given_name: 'zxcv',
            family_name: 'qwer',
          },
        },
      };

      mockRes = {
        render: mockRender,
      };
    });

    it('renders home with API greeting and user details', async () => {
      (getRootGreeting as jest.Mock).mockResolvedValue('Hello from PCS API');

      await routeHandler(mockReq, mockRes);

      expect(getRootGreeting).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalledWith(
        'home',
        expect.objectContaining({
          apiResponse: 'Hello from PCS API',
          givenName: 'zxcv',
          familyName: 'qwer',
          currentTime: expect.any(String),
        })
      );
    });

    it('renders home with default greeting when API call fails', async () => {
      (getRootGreeting as jest.Mock).mockRejectedValue(new Error('API error'));

      await routeHandler(mockReq, mockRes);

      expect(getRootGreeting).toHaveBeenCalled();
      expect(mockRender).toHaveBeenCalledWith(
        'home',
        expect.objectContaining({
          apiResponse: 'default value',
          givenName: 'zxcv',
          familyName: 'qwer',
          currentTime: expect.any(String),
        })
      );
    });

    it('renders home with undefined user data if session user missing', async () => {
      (getRootGreeting as jest.Mock).mockResolvedValue('Hi');

      mockReq.session = {}; // no user

      await routeHandler(mockReq, mockRes);

      expect(mockRender).toHaveBeenCalledWith(
        'home',
        expect.objectContaining({
          apiResponse: 'Hi',
          givenName: undefined,
          familyName: undefined,
          currentTime: expect.any(String),
        })
      );
    });
  });
});
