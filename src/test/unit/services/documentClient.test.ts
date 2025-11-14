import config from 'config';

import { http } from '../../../main/modules/http';
import { DocumentClient, FileResponse, documentIdExtractor } from '../../../main/services/documentClient';

jest.mock('config');
jest.mock('../../../main/modules/http');

const mockGet = http.get as jest.Mock;

describe('documentIdExtractor', () => {
  it('extracts UUID from valid document binary URL', () => {
    const url = 'https://example.com/documents/a1b2c3d4-5678-90ab-cdef-1234567890ab/binary';
    const result = documentIdExtractor(url);
    expect(result).toBe('a1b2c3d4-5678-90ab-cdef-1234567890ab');
  });

  it('extracts UUID from URL with path prefix', () => {
    const url = '/documents/a1b2c3d4-5678-90ab-cdef-1234567890ab/binary';
    const result = documentIdExtractor(url);
    expect(result).toBe('a1b2c3d4-5678-90ab-cdef-1234567890ab');
  });

  it('returns undefined for invalid URL pattern', () => {
    const url = 'https://example.com/documents/invalid/path';
    const result = documentIdExtractor(url);
    expect(result).toBeUndefined();
  });

  it('returns undefined for URL without binary suffix', () => {
    const url = 'https://example.com/documents/a1b2c3d4-5678-90ab-cdef-1234567890ab';
    const result = documentIdExtractor(url);
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    const result = documentIdExtractor('');
    expect(result).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    const result = documentIdExtractor(undefined as unknown as string);
    expect(result).toBeUndefined();
  });
});

describe('DocumentClient', () => {
  let documentClient: DocumentClient;
  const mockApiUrl = 'https://api.example.com';
  const mockAccessToken = 'test-token-123';

  beforeEach(() => {
    (config.get as jest.Mock).mockImplementation(key => {
      if (key === 'api.url') {
        return mockApiUrl;
      }
    });
    documentClient = new DocumentClient();
    jest.clearAllMocks();
  });

  describe('retrieveDocument', () => {
    it('retrieves document successfully with all headers', async () => {
      const mockDocumentId = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';
      const mockBuffer = Buffer.from('test file content');

      mockGet.mockResolvedValue({
        data: mockBuffer,
        headers: {
          'content-type': 'application/pdf',
          'original-file-name': 'test-document.pdf',
        },
      });

      const result = await documentClient.retrieveDocument(mockDocumentId, mockAccessToken);

      expect(mockGet).toHaveBeenCalledWith(`${mockApiUrl}/case/document/downloadDocument/${mockDocumentId}`, {
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
        responseType: 'arraybuffer',
        responseEncoding: 'binary',
      });

      expect(result).toBeInstanceOf(FileResponse);
      expect(result.contentType).toBe('application/pdf');
      expect(result.fileName).toBe('test-document.pdf');
      expect(result.data).toBe(mockBuffer);
    });

    it('uses default content type when not provided', async () => {
      const mockDocumentId = 'test-doc-id';
      const mockBuffer = Buffer.from('test content');

      mockGet.mockResolvedValue({
        data: mockBuffer,
        headers: {
          'original-file-name': 'test.txt',
        },
      });

      const result = await documentClient.retrieveDocument(mockDocumentId, mockAccessToken);

      expect(result.contentType).toBe('application/octet-stream');
      expect(result.fileName).toBe('test.txt');
    });

    it('uses default filename when not provided', async () => {
      const mockDocumentId = 'test-doc-id';
      const mockBuffer = Buffer.from('test content');

      mockGet.mockResolvedValue({
        data: mockBuffer,
        headers: {
          'content-type': 'text/plain',
        },
      });

      const result = await documentClient.retrieveDocument(mockDocumentId, mockAccessToken);

      expect(result.contentType).toBe('text/plain');
      expect(result.fileName).toBe('document-test-doc-id');
    });

    it('throws error when document retrieval fails', async () => {
      const mockDocumentId = 'test-doc-id';
      const mockError = new Error('Network error');

      mockGet.mockRejectedValue(mockError);

      await expect(documentClient.retrieveDocument(mockDocumentId, mockAccessToken)).rejects.toThrow('Network error');
    });
  });
});
