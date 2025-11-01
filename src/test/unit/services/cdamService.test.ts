import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import type { UploadedFile } from 'express-fileupload';

import { http } from '../../../main/modules/http';
import { CDAMService, cdamService } from '../../../main/services/cdamService';
import type { DocumentManagementFile } from '../../../types/global';

// Mock form-data before importing
const mockFormDataInstance = {
  append: jest.fn(),
  getHeaders: jest.fn(),
};

jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => mockFormDataInstance);
});

jest.mock('config');
jest.mock('../../../main/modules/http');
jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn().mockReturnValue({
      error: jest.fn(),
      info: jest.fn(),
    }),
  },
}));

const mockPost = http.post as jest.Mock;
const mockConfigGet = config.get as jest.Mock;

describe('CDAMService', () => {
  let mockLogger: {
    error: jest.Mock;
    info: jest.Mock;
  };

  beforeEach(() => {
    // Clear mocks first
    jest.clearAllMocks();
    mockFormDataInstance.append.mockClear();
    mockFormDataInstance.getHeaders.mockClear();

    // Then set up mocks
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
    };

    (Logger.getLogger as jest.Mock).mockReturnValue(mockLogger);

    mockConfigGet.mockImplementation((key: string) => {
      const configMap: Record<string, string> = {
        'cdam.url': 'http://cdam.example.com',
        jurisdiction: 'TEST_JURISDICTION',
        caseType: 'TEST_CASE_TYPE',
      };
      return configMap[key];
    });
  });

  describe('constructor', () => {
    it('should initialize with config values', () => {
      new CDAMService();

      expect(config.get).toHaveBeenCalledWith('cdam.url');
      expect(config.get).toHaveBeenCalledWith('jurisdiction');
      expect(config.get).toHaveBeenCalledWith('caseType');
    });
  });

  describe('uploadDocuments', () => {
    const accessToken = 'test-access-token';
    const userId = 'test-user-id';

    it('should upload a single file successfully', async () => {
      const mockFile: UploadedFile = {
        name: 'test.pdf',
        data: Buffer.from('test content'),
        mimetype: 'application/pdf',
        size: 1234,
        encoding: 'utf-8',
        tempFilePath: '',
        truncated: false,
        md5: 'hash',
        mv: jest.fn(),
      };

      const mockCdamResponse = {
        documents: [
          {
            originalDocumentName: 'test.pdf',
            classification: 'PUBLIC',
            size: 1234,
            mimeType: 'application/pdf',
            _links: {
              self: {
                href: 'http://cdam.example.com/documents/123',
              },
              binary: {
                href: 'http://cdam.example.com/documents/123/binary',
              },
            },
          },
        ],
      };

      mockPost.mockResolvedValue({ data: mockCdamResponse });
      mockFormDataInstance.getHeaders.mockReturnValue({ 'content-type': 'multipart/form-data' });

      // Create a fresh instance to test with mocked config values
      const service = new CDAMService();
      const result = await service.uploadDocuments(mockFile, userId, accessToken);

      expect(mockFormDataInstance.append).toHaveBeenCalledWith('classification', 'PUBLIC');
      expect(mockFormDataInstance.append).toHaveBeenCalledWith('caseTypeId', 'TEST_CASE_TYPE');
      expect(mockFormDataInstance.append).toHaveBeenCalledWith('jurisdictionId', 'TEST_JURISDICTION');
      expect(mockFormDataInstance.append).toHaveBeenCalledWith('files', mockFile.data, {
        filename: mockFile.name,
        contentType: mockFile.mimetype,
      });

      expect(mockPost).toHaveBeenCalledWith(
        'http://cdam.example.com/cases/documents',
        mockFormDataInstance,
        expect.objectContaining({
          headers: expect.objectContaining({
            'content-type': 'multipart/form-data',
            Authorization: `Bearer ${accessToken}`,
            'user-id': userId,
          }),
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        })
      );

      expect(result).toEqual(mockCdamResponse.documents);
    });

    it('should upload multiple files successfully', async () => {
      const mockFiles: UploadedFile[] = [
        {
          name: 'test1.pdf',
          data: Buffer.from('test content 1'),
          mimetype: 'application/pdf',
          size: 1234,
          encoding: 'utf-8',
          tempFilePath: '',
          truncated: false,
          md5: 'hash1',
          mv: jest.fn(),
        },
        {
          name: 'test2.pdf',
          data: Buffer.from('test content 2'),
          mimetype: 'application/pdf',
          size: 5678,
          encoding: 'utf-8',
          tempFilePath: '',
          truncated: false,
          md5: 'hash2',
          mv: jest.fn(),
        },
      ];

      const mockCdamResponse = {
        documents: [
          {
            originalDocumentName: 'test1.pdf',
            _links: {
              self: { href: 'http://cdam.example.com/documents/123' },
              binary: { href: 'http://cdam.example.com/documents/123/binary' },
            },
          },
          {
            originalDocumentName: 'test2.pdf',
            _links: {
              self: { href: 'http://cdam.example.com/documents/456' },
              binary: { href: 'http://cdam.example.com/documents/456/binary' },
            },
          },
        ],
      };

      mockPost.mockResolvedValue({ data: mockCdamResponse });
      mockFormDataInstance.getHeaders.mockReturnValue({ 'content-type': 'multipart/form-data' });

      const result = await cdamService.uploadDocuments(mockFiles, userId, accessToken);

      expect(mockFormDataInstance.append).toHaveBeenCalledWith('files', mockFiles[0].data, {
        filename: mockFiles[0].name,
        contentType: mockFiles[0].mimetype,
      });
      expect(mockFormDataInstance.append).toHaveBeenCalledWith('files', mockFiles[1].data, {
        filename: mockFiles[1].name,
        contentType: mockFiles[1].mimetype,
      });

      expect(result).toEqual(mockCdamResponse.documents);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when response has no documents', async () => {
      const mockFile: UploadedFile = {
        name: 'test.pdf',
        data: Buffer.from('test'),
        mimetype: 'application/pdf',
        size: 1234,
        encoding: 'utf-8',
        tempFilePath: '',
        truncated: false,
        md5: 'hash',
        mv: jest.fn(),
      };

      mockPost.mockResolvedValue({ data: {} });
      mockFormDataInstance.getHeaders.mockReturnValue({});

      const result = await cdamService.uploadDocuments(mockFile, userId, accessToken);

      expect(result).toEqual([]);
    });

    it('should handle CDAM API error and throw with descriptive message', async () => {
      const mockFile: UploadedFile = {
        name: 'test.pdf',
        data: Buffer.from('test'),
        mimetype: 'application/pdf',
        size: 1234,
        encoding: 'utf-8',
        tempFilePath: '',
        truncated: false,
        md5: 'hash',
        mv: jest.fn(),
      };

      const mockError = {
        message: 'Network error',
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
      };

      mockPost.mockRejectedValue(mockError);
      mockFormDataInstance.getHeaders.mockReturnValue({});

      await expect(cdamService.uploadDocuments(mockFile, userId, accessToken)).rejects.toThrow(
        'Failed to upload documents to CDAM'
      );
    });

    it('should handle error without response object', async () => {
      const mockFile: UploadedFile = {
        name: 'test.pdf',
        data: Buffer.from('test'),
        mimetype: 'application/pdf',
        size: 1234,
        encoding: 'utf-8',
        tempFilePath: '',
        truncated: false,
        md5: 'hash',
        mv: jest.fn(),
      };

      const mockError = new Error('Connection timeout');

      mockPost.mockRejectedValue(mockError);
      mockFormDataInstance.getHeaders.mockReturnValue({});

      await expect(cdamService.uploadDocuments(mockFile, userId, accessToken)).rejects.toThrow(
        'Failed to upload documents to CDAM'
      );
    });

    it('should handle non-Error type exceptions', async () => {
      const mockFile: UploadedFile = {
        name: 'test.pdf',
        data: Buffer.from('test'),
        mimetype: 'application/pdf',
        size: 1234,
        encoding: 'utf-8',
        tempFilePath: '',
        truncated: false,
        md5: 'hash',
        mv: jest.fn(),
      };

      mockPost.mockRejectedValue('String error');
      mockFormDataInstance.getHeaders.mockReturnValue({});

      await expect(cdamService.uploadDocuments(mockFile, userId, accessToken)).rejects.toThrow(
        'Failed to upload documents to CDAM'
      );
    });

    it('should handle CDAM response with full document metadata', async () => {
      const mockFile: UploadedFile = {
        name: 'detailed-doc.pdf',
        data: Buffer.from('test content'),
        mimetype: 'application/pdf',
        size: 2048,
        encoding: 'utf-8',
        tempFilePath: '',
        truncated: false,
        md5: 'hash',
        mv: jest.fn(),
      };

      const mockCdamResponse = {
        documents: [
          {
            classification: 'PUBLIC',
            size: 2048,
            mimeType: 'application/pdf',
            originalDocumentName: 'detailed-doc.pdf',
            hashToken: 'abc123',
            createdOn: '2025-01-01T00:00:00Z',
            createdBy: 'user123',
            lastModifiedBy: 'user123',
            modifiedOn: '2025-01-01T00:00:00Z',
            ttl: '2026-01-01T00:00:00Z',
            metadata: {
              case_type_id: 'TEST_CASE_TYPE',
              jurisdiction: 'TEST_JURISDICTION',
            },
            _links: {
              self: {
                href: 'http://cdam.example.com/documents/789',
              },
              binary: {
                href: 'http://cdam.example.com/documents/789/binary',
              },
            },
            description: 'Test document with full metadata',
          },
        ] as DocumentManagementFile[],
      };

      mockPost.mockResolvedValue({ data: mockCdamResponse });
      mockFormDataInstance.getHeaders.mockReturnValue({});

      const result = await cdamService.uploadDocuments(mockFile, userId, accessToken);

      expect(result).toEqual(mockCdamResponse.documents);
      expect(result[0].classification).toBe('PUBLIC');
      expect(result[0].originalDocumentName).toBe('detailed-doc.pdf');
      expect(result[0].metadata?.case_type_id).toBe('TEST_CASE_TYPE');
      expect(result[0].metadata?.jurisdiction).toBe('TEST_JURISDICTION');
    });

    it('should correctly set HTTP headers including auth and user-id', async () => {
      const mockFile: UploadedFile = {
        name: 'test.pdf',
        data: Buffer.from('test'),
        mimetype: 'application/pdf',
        size: 1234,
        encoding: 'utf-8',
        tempFilePath: '',
        truncated: false,
        md5: 'hash',
        mv: jest.fn(),
      };

      const specificAccessToken = 'specific-token-123';
      const specificUserId = 'user-456';

      mockPost.mockResolvedValue({ data: { documents: [] } });
      mockFormDataInstance.getHeaders.mockReturnValue({ 'content-type': 'multipart/form-data; boundary=xyz' });

      await cdamService.uploadDocuments(mockFile, specificUserId, specificAccessToken);

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'content-type': 'multipart/form-data; boundary=xyz',
            Authorization: `Bearer ${specificAccessToken}`,
            'user-id': specificUserId,
          }),
        })
      );
    });

    it('should use correct CDAM endpoint URL', async () => {
      const mockFile: UploadedFile = {
        name: 'test.pdf',
        data: Buffer.from('test'),
        mimetype: 'application/pdf',
        size: 1234,
        encoding: 'utf-8',
        tempFilePath: '',
        truncated: false,
        md5: 'hash',
        mv: jest.fn(),
      };

      mockPost.mockResolvedValue({ data: { documents: [] } });
      mockFormDataInstance.getHeaders.mockReturnValue({});

      // Create a fresh instance to test with mocked config values
      const service = new CDAMService();
      await service.uploadDocuments(mockFile, userId, accessToken);

      expect(mockPost).toHaveBeenCalledWith(
        'http://cdam.example.com/cases/documents',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should set maxContentLength and maxBodyLength to Infinity', async () => {
      const mockFile: UploadedFile = {
        name: 'test.pdf',
        data: Buffer.from('test'),
        mimetype: 'application/pdf',
        size: 1234,
        encoding: 'utf-8',
        tempFilePath: '',
        truncated: false,
        md5: 'hash',
        mv: jest.fn(),
      };

      mockPost.mockResolvedValue({ data: { documents: [] } });
      mockFormDataInstance.getHeaders.mockReturnValue({});

      await cdamService.uploadDocuments(mockFile, userId, accessToken);

      expect(mockPost).toHaveBeenCalledWith(expect.any(String), expect.any(Object), {
        headers: expect.any(Object),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
    });
  });
});
