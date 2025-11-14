import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import { Application, Response } from 'express';

import { oidcMiddleware } from '../../../main/middleware/oidc';
import caseDetailsRoute from '../../../main/routes/case-details';
import { ccdCaseService } from '../../../main/services/ccdCaseService';
import { documentIdExtractor } from '../../../main/services/documentClient';

jest.mock('../../../main/services/ccdCaseService');
jest.mock('../../../main/services/documentClient');
jest.mock('../../../main/middleware/oidc');
jest.mock('config');
jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

type MockApp = {
  get: jest.Mock;
};

describe('Case Details Route', () => {
  let mockApp: MockApp;
  let mockGet: jest.Mock;
  let mockLogger: {
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };

  beforeEach(() => {
    mockGet = jest.fn();
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockApp = {
      get: mockGet,
    };

    jest.clearAllMocks();
    (Logger.getLogger as jest.Mock).mockReturnValue(mockLogger);
    (config.get as jest.Mock).mockImplementation(key => {
      if (key === 'caseReference') {
        return '1234567890123456';
      }
    });
  });

  it('should register the case details route', () => {
    caseDetailsRoute(mockApp as unknown as Application);
    expect(mockGet).toHaveBeenCalledWith('/case-details', oidcMiddleware, expect.any(Function));
  });

  describe('GET /case-details', () => {
    let mockReq: {
      session?: {
        user?: {
          accessToken?: string;
        };
      };
    };
    let mockRes: Partial<Response>;

    beforeEach(() => {
      mockReq = {
        session: {
          user: {
            accessToken: 'test-access-token',
          },
        },
      };

      mockRes = {
        render: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
    });

    it('should render case details successfully', async () => {
      const mockCaseData = {
        id: '1234567890123456',
        data: {
          applicantForename: 'John',
          applicantSurname: 'Doe',
        },
      };

      (ccdCaseService.getCaseByReference as jest.Mock).mockResolvedValue(mockCaseData);

      caseDetailsRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      await routeHandler(mockReq, mockRes);

      expect(ccdCaseService.getCaseByReference).toHaveBeenCalledWith('test-access-token', '1234567890123456');
      expect(mockRes.render).toHaveBeenCalledWith('case-details', {
        caseReference: '1234567890123456',
        caseData: mockCaseData,
        error: null,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[case-details] Fetching case data for case reference: 1234567890123456'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[case-details] Successfully retrieved case data for: 1234567890123456'
      );
    });

    it('should render 404 when case not found', async () => {
      (ccdCaseService.getCaseByReference as jest.Mock).mockResolvedValue(null);

      caseDetailsRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      await routeHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.render).toHaveBeenCalledWith('case-details', {
        error: 'Case not found for reference: 1234567890123456',
        caseReference: '1234567890123456',
        caseData: null,
      });
      expect(mockLogger.warn).toHaveBeenCalledWith('[case-details] No case found for reference: 1234567890123456');
    });

    it('should process documents and extract UUIDs from binary URLs', async () => {
      const mockCaseData = {
        id: '1234567890123456',
        data: {
          tenancyLicenceDocuments: [
            {
              value: {
                document_binary_url: 'https://example.com/documents/a1b2c3d4-5678-90ab-cdef-1234567890ab/binary',
                document_url: 'https://example.com/documents/a1b2c3d4-5678-90ab-cdef-1234567890ab',
              },
            },
            {
              value: {
                document_binary_url: 'https://example.com/documents/b2c3d4e5-6789-01bc-def0-234567890abc/binary',
                document_url: 'https://example.com/documents/b2c3d4e5-6789-01bc-def0-234567890abc',
              },
            },
          ],
        },
      };

      (ccdCaseService.getCaseByReference as jest.Mock).mockResolvedValue(mockCaseData);
      (documentIdExtractor as jest.Mock)
        .mockReturnValueOnce('a1b2c3d4-5678-90ab-cdef-1234567890ab')
        .mockReturnValueOnce('b2c3d4e5-6789-01bc-def0-234567890abc');

      caseDetailsRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      await routeHandler(mockReq, mockRes);

      expect(documentIdExtractor).toHaveBeenCalledTimes(2);
      expect(documentIdExtractor).toHaveBeenCalledWith(
        'https://example.com/documents/a1b2c3d4-5678-90ab-cdef-1234567890ab/binary'
      );
      expect(documentIdExtractor).toHaveBeenCalledWith(
        'https://example.com/documents/b2c3d4e5-6789-01bc-def0-234567890abc/binary'
      );

      const renderCall = (mockRes.render as jest.Mock).mock.calls[0];
      expect(renderCall[1].caseData.data.tenancyLicenceDocuments[0].documentUuid).toBe(
        'a1b2c3d4-5678-90ab-cdef-1234567890ab'
      );
      expect(renderCall[1].caseData.data.tenancyLicenceDocuments[1].documentUuid).toBe(
        'b2c3d4e5-6789-01bc-def0-234567890abc'
      );
    });

    it('should fallback to document_url when binary_url extraction fails', async () => {
      const mockCaseData = {
        id: '1234567890123456',
        data: {
          tenancyLicenceDocuments: [
            {
              value: {
                document_binary_url: 'invalid-url',
                document_url: 'https://example.com/documents/c3d4e5f6-7890-12cd-ef01-34567890abcd/binary',
              },
            },
          ],
        },
      };

      (ccdCaseService.getCaseByReference as jest.Mock).mockResolvedValue(mockCaseData);
      (documentIdExtractor as jest.Mock)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce('c3d4e5f6-7890-12cd-ef01-34567890abcd');

      caseDetailsRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      await routeHandler(mockReq, mockRes);

      expect(documentIdExtractor).toHaveBeenCalledWith('invalid-url');
      expect(documentIdExtractor).toHaveBeenCalledWith(
        'https://example.com/documents/c3d4e5f6-7890-12cd-ef01-34567890abcd/binary'
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[case-details] Failed to extract UUID from: invalid-url, trying document_url: https://example.com/documents/c3d4e5f6-7890-12cd-ef01-34567890abcd/binary'
      );

      const renderCall = (mockRes.render as jest.Mock).mock.calls[0];
      expect(renderCall[1].caseData.data.tenancyLicenceDocuments[0].documentUuid).toBe(
        'c3d4e5f6-7890-12cd-ef01-34567890abcd'
      );
    });

    it('should handle case without documents', async () => {
      const mockCaseData = {
        id: '1234567890123456',
        data: {
          applicantForename: 'Jane',
        },
      };

      (ccdCaseService.getCaseByReference as jest.Mock).mockResolvedValue(mockCaseData);

      caseDetailsRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      await routeHandler(mockReq, mockRes);

      expect(mockRes.render).toHaveBeenCalledWith('case-details', {
        caseReference: '1234567890123456',
        caseData: mockCaseData,
        error: null,
      });
    });

    it('should render 500 when service throws error', async () => {
      const mockError = new Error('Service error');
      (ccdCaseService.getCaseByReference as jest.Mock).mockRejectedValue(mockError);

      caseDetailsRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      await routeHandler(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.render).toHaveBeenCalledWith('case-details', {
        error: 'Error fetching case data: Error: Service error',
        caseReference: '1234567890123456',
        caseData: null,
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[case-details] Failed to fetch case data. Error was: Error: Service error'
      );
    });
  });
});
