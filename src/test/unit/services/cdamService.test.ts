import config from 'config';

import { http } from '@modules/http';
import { deleteDocument, uploadDocument } from '@services/cdamService';

jest.mock('config');
jest.mock('@modules/http');

const mockPost = http.post as jest.Mock;
const mockDelete = http.delete as jest.Mock;

const mockCdamUrl = 'http://cdam.example.com';
const mockCaseTypeId = 'PCS';
const userToken = 'user-access-token';

(config.get as jest.Mock).mockImplementation((key: string) => {
  if (key === 'cdam.url') {return mockCdamUrl;}
  if (key === 'ccd.caseTypeId') {return mockCaseTypeId;}
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

    it('throws for invalid document URL with no UUID', async () => {
      await expect(deleteDocument('http://dm-store/no-documents-path', userToken)).rejects.toThrow(
        'Invalid document ID'
      );
    });

    it('throws for empty document URL', async () => {
      await expect(deleteDocument('', userToken)).rejects.toThrow('Invalid document ID');
    });

    it('throws for document URL with non-UUID ID', async () => {
      await expect(deleteDocument('http://dm-store/documents/../../etc/passwd', userToken)).rejects.toThrow(
        'Invalid document ID'
      );
    });

    it('throws for document URL with path traversal', async () => {
      await expect(deleteDocument('http://dm-store/documents/../secret', userToken)).rejects.toThrow(
        'Invalid document ID'
      );
    });
  });
});
