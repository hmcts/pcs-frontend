import config from 'config';
import { PassThrough } from 'stream';

import { HTTPError } from '../../../main/HttpError';

import { http } from '@modules/http';
import { ccdCaseService } from '@services/ccdCaseService';
import { deleteDocument, getDocumentStream, uploadDocument } from '@services/cdamService';

jest.mock('config');
jest.mock('@modules/http');
jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
  },
}));

const mockPost = http.post as jest.Mock;
const mockDelete = http.delete as jest.Mock;
const mockGet = http.get as jest.Mock;

const mockCdamUrl = 'http://cdam.example.com';
const mockCaseTypeId = 'PCS';
const userToken = 'user-access-token';

(config.get as jest.Mock).mockImplementation((key: string) => {
  if (key === 'cdam.url') {
    return mockCdamUrl;
  }
  if (key === 'ccd.caseTypeId') {
    return mockCaseTypeId;
  }
  return '';
});

const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File =>
  ({
    buffer: Buffer.from('file content'),
    originalname: 'test-document.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    fieldname: 'documents',
    encoding: '7bit',
    stream: null,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  }) as Express.Multer.File;

describe('cdamService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    const cdamResponse = {
      data: {
        documents: [
          {
            originalDocumentName: 'test-document.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            _links: {
              self: { href: 'http://dm-store/documents/abc-123' },
              binary: { href: 'http://dm-store/documents/abc-123/binary' },
            },
          },
        ],
      },
    };

    it('uploads file to CDAM and returns normalised document', async () => {
      mockPost.mockResolvedValue(cdamResponse);

      const result = await uploadDocument(createMockFile(), userToken);

      expect(mockPost).toHaveBeenCalledWith(
        `${mockCdamUrl}/cases/documents`,
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${userToken}`,
          }),
        })
      );

      expect(result).toEqual({
        document_url: 'http://dm-store/documents/abc-123',
        document_binary_url: 'http://dm-store/documents/abc-123/binary',
        document_filename: 'test-document.pdf',
        content_type: 'application/pdf',
        size: 1024,
      });
    });

    it('uses file originalname when CDAM returns no document name', async () => {
      const response = {
        data: {
          documents: [
            {
              originalDocumentName: '',
              mimeType: 'application/pdf',
              size: 512,
              _links: {
                self: { href: 'http://dm-store/documents/def-456' },
                binary: { href: 'http://dm-store/documents/def-456/binary' },
              },
            },
          ],
        },
      };
      mockPost.mockResolvedValue(response);

      const result = await uploadDocument(createMockFile({ originalname: 'fallback.pdf' }), userToken);

      expect(result.document_filename).toBe('fallback.pdf');
    });

    it('throws when CDAM returns no documents', async () => {
      mockPost.mockResolvedValue({ data: { documents: [] } });

      await expect(uploadDocument(createMockFile(), userToken)).rejects.toThrow(
        'CDAM returned no document in response'
      );
    });

    it('throws when CDAM returns null response', async () => {
      mockPost.mockResolvedValue({ data: null });

      await expect(uploadDocument(createMockFile(), userToken)).rejects.toThrow();
    });

    it('uses file size when CDAM returns no size', async () => {
      const response = {
        data: {
          documents: [
            {
              originalDocumentName: 'doc.pdf',
              mimeType: 'application/pdf',
              size: undefined,
              _links: {
                self: { href: 'http://dm-store/documents/size-test' },
                binary: { href: 'http://dm-store/documents/size-test/binary' },
              },
            },
          ],
        },
      };
      mockPost.mockResolvedValue(response);

      const result = await uploadDocument(createMockFile({ size: 2048 }), userToken);

      expect(result.size).toBe(2048);
    });

    it('uses file mimetype when CDAM returns empty mimeType', async () => {
      const response = {
        data: {
          documents: [
            {
              originalDocumentName: 'doc.pdf',
              mimeType: '',
              size: 100,
              _links: {
                self: { href: 'http://dm-store/documents/ghi-789' },
                binary: { href: 'http://dm-store/documents/ghi-789/binary' },
              },
            },
          ],
        },
      };
      mockPost.mockResolvedValue(response);

      const result = await uploadDocument(createMockFile({ mimetype: 'application/pdf' }), userToken);

      expect(result.content_type).toBe('application/pdf');
    });
  });

  describe('deleteDocument', () => {
    it('deletes document from CDAM using extracted UUID', async () => {
      mockDelete.mockResolvedValue({});
      const uuid = 'dc1e8cec-d2b0-494f-8c2a-d18ece6b3e6d';

      await deleteDocument(`http://dm-store/documents/${uuid}`, userToken);

      expect(mockDelete).toHaveBeenCalledWith(
        `${mockCdamUrl}/cases/documents/${uuid}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${userToken}`,
          }),
        })
      );
    });

    it('rewrites dm-store URL to CDAM path for delete', async () => {
      mockDelete.mockResolvedValue({});
      const uuid = 'abc12345-1234-1234-1234-123456789abc';

      await deleteDocument(`http://dm-store-aat.service.core-compute-aat.internal/documents/${uuid}`, userToken);

      expect(mockDelete).toHaveBeenCalledWith(
        `${mockCdamUrl}/cases/documents/${uuid}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${userToken}`,
          }),
        })
      );
    });
  });

  describe('getDocumentStream', () => {
    it('returns document stream metadata when document exists', async () => {
      (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
        id: '1777570813792018',
        data: {
          allDocuments: [
            {
              id: 'doc-1',
              value: {
                document_filename: 'claim-form.pdf',
                document_binary_url: 'http://dm-store/documents/69a31b98-9de1-49ae-a79c-97d8c521d0f5/binary',
              },
            },
          ],
        },
      });
      const stream = new PassThrough();
      mockGet.mockResolvedValue({
        headers: {
          'content-type': 'application/pdf',
          'content-length': '1234',
        },
        data: stream,
      });

      const result = await getDocumentStream('token', '1777570813792018', 'doc-1');

      expect(mockGet).toHaveBeenCalledWith(
        `${mockCdamUrl}/cases/documents/69a31b98-9de1-49ae-a79c-97d8c521d0f5/binary`,
        {
          headers: { Authorization: 'Bearer token' },
          responseType: 'stream',
        }
      );
      expect(result.filename).toBe('claim-form.pdf');
      expect(result.contentType).toBe('application/pdf');
      expect(result.contentLength).toBe('1234');
      expect(result.stream).toBe(stream);
    });

    it('throws 404 when document cannot be found', async () => {
      (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
        id: '1777570813792018',
        data: {
          allDocuments: [],
        },
      });

      await expect(getDocumentStream('token', '1777570813792018', 'missing')).rejects.toEqual(
        expect.objectContaining<Partial<HTTPError>>({
          message: 'Document not found',
          status: 404,
        })
      );
    });

    it('throws 404 when document binary URL is missing', async () => {
      (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
        id: '1777570813792018',
        data: {
          allDocuments: [
            {
              id: 'doc-1',
              value: {
                document_filename: 'claim-form.pdf',
              },
            },
          ],
        },
      });

      await expect(getDocumentStream('token', '1777570813792018', 'doc-1')).rejects.toEqual(
        expect.objectContaining<Partial<HTTPError>>({
          message: 'Document not found',
          status: 404,
        })
      );
    });
  });
});
