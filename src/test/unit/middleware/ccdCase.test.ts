import { NextFunction, Request, Response } from 'express';
import { Session } from 'express-session';
import { UserInfoResponse } from 'openid-client';

import { mapCaseDataToFormData } from '../../../main/app/utils/sessionCaseMapper';
import { CcdCase } from '../../../main/interfaces/ccdCase.interface';
import { ccdCaseMiddleware } from '../../../main/middleware/ccdCase';
import { ccdCaseService } from '../../../main/services/ccdCaseService';

interface CustomSession extends Session {
  user?: UserInfoResponse & {
    accessToken: string;
    idToken: string;
    refreshToken: string;
  };
  formData?: Record<string, unknown>;
  ccdCase?: CcdCase;
}

jest.mock('../../../main/services/ccdCaseService');
jest.mock('../../../main/app/utils/sessionCaseMapper');

describe('ccdCaseMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    mockReq = {
      session: {
        user: {
          sub: 'user-123',
          uid: '123',
          accessToken: 'token',
          idToken: 'dummy-id-token',
          refreshToken: 'dummy-refresh-token',
        },
        ccdCase: undefined,
        formData: {},
        id: 'mock-session-id',
        cookie: {},
        regenerate: jest.fn(),
        destroy: jest.fn(),
        reload: jest.fn(),
        save: jest.fn(),
        touch: jest.fn(),
        resetMaxAge: jest.fn(),
      } as unknown as CustomSession,
    };

    mockRes = {};
    next = jest.fn();
  });

  it('should fetch and set ccdCase and formData if no ccdCase in session', async () => {
    const mockCase = { id: 'case123', data: { some: 'data' } };
    const mappedFormData = { 'enter-user-details': { name: 'John' } };

    (ccdCaseService.getCase as jest.Mock).mockResolvedValue(mockCase);
    (mapCaseDataToFormData as jest.Mock).mockReturnValue(mappedFormData);

    await ccdCaseMiddleware(mockReq as Request, mockRes as Response, next);

    expect(ccdCaseService.getCase).toHaveBeenCalledWith('token');
    expect(mapCaseDataToFormData).toHaveBeenCalledWith(mockCase);
    expect(mockReq.session?.ccdCase).toEqual(mockCase);
    expect(mockReq.session?.formData).toEqual(mappedFormData);
    expect(next).toHaveBeenCalledWith();
  });

  it('should call next with error if user not authenticated', async () => {
    mockReq.session!.user = undefined;

    await ccdCaseMiddleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should call next with error if ccdCaseService.getCase throws', async () => {
    (ccdCaseService.getCase as jest.Mock).mockRejectedValue(new Error('CCD error'));

    await ccdCaseMiddleware(mockReq as Request, mockRes as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
