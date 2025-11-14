import { Logger } from '@hmcts/nodejs-logging';
import { Application } from 'express';

import { oidcMiddleware } from '../../../main/middleware/oidc';
import documentDownloadRoute from '../../../main/routes/document-download';
import { documentClient } from '../../../main/services/documentClient';

jest.mock('../../../main/services/documentClient');
jest.mock('../../../main/middleware/oidc');
jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

type MockApp = {
  get: jest.Mock;
};

describe('Document Download Route', () => {
  let mockApp: MockApp;
  let mockGet: jest.Mock;
  let mockLogger: {
    info: jest.Mock;
    error: jest.Mock;
  };

  beforeEach(() => {
    mockGet = jest.fn();
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    mockApp = {
      get: mockGet,
    };

    jest.clearAllMocks();
    (Logger.getLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  it('should register the document download route', () => {
    documentDownloadRoute(mockApp as unknown as Application);
    expect(mockGet).toHaveBeenCalledWith('/documents/:documentId/download', oidcMiddleware, expect.any(Function));
  });

  describe('GET /documents/:documentId/download', () => {
    let mockReq: {
      params: {
        documentId: string;
      };
      session?: {
        user?: {
          accessToken?: string;
        };
      };
    };
    let mockRes: {
      writeHead: jest.Mock;
      end: jest.Mock;
      status: jest.Mock;
      send: jest.Mock;
    };

    beforeEach(() => {
      mockReq = {
        params: {
          documentId: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
        },
        session: {
          user: {
            accessToken: 'test-access-token',
          },
        },
      };

      mockRes = {
        writeHead: jest.fn(),
        end: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
    });

    it('should return 401 when no access token in session', async () => {
      mockReq.session = {};

      documentDownloadRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      await routeHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith('Unauthorized');
      expect(mockLogger.error).toHaveBeenCalledWith('[document-download] No access token found in session');
      expect(documentClient.retrieveDocument).not.toHaveBeenCalled();
    });

    it('should return 401 when session user is undefined', async () => {
      mockReq.session = {
        user: undefined,
      };

      documentDownloadRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      await routeHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith('Unauthorized');
      expect(documentClient.retrieveDocument).not.toHaveBeenCalled();
    });

    it('should return 500 when document retrieval fails', async () => {
      const mockError = new Error('Failed to retrieve document');
      (documentClient.retrieveDocument as jest.Mock).mockRejectedValue(mockError);

      documentDownloadRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      await routeHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Failed to download document');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[document-download] Failed to download document: Failed to retrieve document'
      );
    });

    it('should handle non-Error exceptions', async () => {
      (documentClient.retrieveDocument as jest.Mock).mockRejectedValue('String error');

      documentDownloadRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      await routeHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Failed to download document');
      expect(mockLogger.error).toHaveBeenCalledWith('[document-download] Failed to download document: String error');
    });
  });
});
