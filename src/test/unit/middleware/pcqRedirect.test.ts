import axios from 'axios';
import config from 'config';
import { NextFunction, Request, Response } from 'express';
import { Session } from 'express-session';

import type { CcdCase } from '../../../main/interfaces/ccdCase.interface';
import { pcqRedirectMiddleware } from '../../../main/middleware/pcqRedirect';
import { ccdCaseService } from '../../../main/services/ccdCaseService';
import * as createTokenModule from '../../../main/services/pcq/createToken';

interface CustomSession extends Session {
  user?: {
    sub: string;
    accessToken: string;
    idToken: string;
    refreshToken: string;
  };
  ccdCase?: CcdCase;
}

jest.mock('axios');
jest.mock('config');
jest.mock('../../../main/modules/http', () => ({
  createHttp: () => ({
    get: jest.fn(),
    post: jest.fn(),
  }),
}));

jest.mock('../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    updateCase: jest.fn(),
  },
}));
jest.mock('../../../main/services/pcq/createToken');

describe('pcqRedirectMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockSave = jest.fn();
  const mockRedirect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      protocol: 'http',
      get: ((name: string) => {
        if (name === 'set-cookie') {
          return undefined;
        } // or []
        if (name === 'host') {
          return 'localhost:3000';
        }
        return undefined;
      }) as Request['get'],
      session: {
        save: mockSave,
        regenerate: jest.fn(),
        destroy: jest.fn(),
        reload: jest.fn(),
        touch: jest.fn(),
        cookie: {},
        id: 'mock-session-id',
        user: {
          sub: 'user-123',
          accessToken: 'test-token',
          idToken: 'dummy-id-token',
          refreshToken: 'dummy-refresh-token',
        },
      } as unknown as CustomSession,
    };

    mockRes = {
      redirect: mockRedirect,
      locals: {
        validatedCase: {
          id: '123456789',
          data: {},
        },
      },
    };

    mockNext = jest.fn();

    (config.get as jest.Mock).mockImplementation((key: string) => {
      const configMap: Record<string, unknown> = {
        'pcq.enabled': true,
        'pcq.url': 'https://pcq.test',
        'pcq.path': '/service-endpoint',
        'pcq.serviceId': 'PCS',
        'pcq.actor': 'APPLICANT',
        'secrets.pcs.pcs-pcq-token-key': 'dummy-token-key',
      };
      return configMap[key];
    });

    (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'UP' } });

    (ccdCaseService.updateCase as jest.Mock).mockResolvedValue({
      id: '123456789',
      data: { userPcqId: 'mock-pcq-id' },
    });

    (createTokenModule.createToken as jest.Mock).mockReturnValue('mock-token');
  });

  it('should redirect to PCQ when all conditions are met', async () => {
    mockSave.mockImplementation(cb => cb());

    const middleware = pcqRedirectMiddleware();
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(axios.get).toHaveBeenCalledWith('https://pcq.test/health');
    expect(createTokenModule.createToken).toHaveBeenCalled();
    expect(ccdCaseService.updateCase).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('https://pcq.test/service-endpoint?'));
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() if PCQ is not enabled', async () => {
    (config.get as jest.Mock).mockImplementation(key => (key === 'pcq.enabled' ? false : ''));

    const middleware = pcqRedirectMiddleware();
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('should call next() if session is missing CCD or user data', async () => {
    mockRes.locals!.validatedCase = undefined;

    const middleware = pcqRedirectMiddleware();
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('should call next() if PCQ health check fails', async () => {
    (axios.get as jest.Mock).mockRejectedValue(new Error('Service down'));

    const middleware = pcqRedirectMiddleware();
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('should call next() if CCD update fails', async () => {
    (ccdCaseService.updateCase as jest.Mock).mockRejectedValue(new Error('CCD error'));
    mockSave.mockImplementation(cb => cb());

    const middleware = pcqRedirectMiddleware();
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('should not redirect if userPcqIdSet is already Yes', async () => {
    mockRes.locals!.validatedCase = {
      id: '123456789',
      data: {
        userPcqIdSet: 'Yes',
      },
    };

    const middleware = pcqRedirectMiddleware();
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
