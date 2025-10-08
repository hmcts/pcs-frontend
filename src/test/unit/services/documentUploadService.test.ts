import { Request } from 'express';
import { UploadedFile } from 'express-fileupload';

import { CaseDocumentManagementClient } from '../../../main/app/document/CaseDocumentManagementClient';
import { Classification, DocumentManagementFile } from '../../../main/interfaces/documentManagement.interface';
import { DocumentUploadService, UploadResult } from '../../../main/services/documentUploadService';

jest.mock('../../../main/app/document/CaseDocumentManagementClient');

const mockCreate = jest.fn();

// Helper to create mock UploadedFile
const createMockUploadedFile = (name: string, size: number, mimetype = 'application/pdf'): UploadedFile =>
  ({
    name,
    size,
    data: Buffer.from('test file content'),
    encoding: 'utf-8',
    mimetype,
    tempFilePath: '',
    truncated: false,
    md5: '',
    mv: jest.fn().mockResolvedValue(undefined),
  }) as unknown as UploadedFile;

type MockRequest = Partial<Request> & {
  session?: unknown;
  files?: unknown;
  body: {
    caseReference: string;
  };
};

describe('DocumentUploadService', () => {
  let mockRequest: MockRequest;
  const mockCaseReference = '1234567890123456';
  const mockUser = {
    accessToken: 'mock-token',
    sub: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    mockRequest = {
      session: {
        user: mockUser,
      },
      files: {
        upload: createMockUploadedFile('test.pdf', 1024),
      },
      body: {
        caseReference: mockCaseReference,
      },
    } as MockRequest;

    (CaseDocumentManagementClient as jest.Mock).mockImplementation(() => ({
      create: mockCreate,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadAndSubmitDocument', () => {
    const mockCdamResponse: DocumentManagementFile[] = [
      {
        size: 1024,
        mimeType: 'application/pdf',
        originalDocumentName: 'test.pdf',
        modifiedOn: '2025-10-08T10:00:00.000Z',
        createdOn: '2025-10-08T10:00:00.000Z',
        classification: Classification.Public,
        _links: {
          self: {
            href: 'http://dm-store.example.com/documents/doc-123',
          },
          binary: {
            href: 'http://dm-store.example.com/documents/doc-123/binary',
          },
        },
      },
    ];

    it('should successfully upload document to CDAM and transform to PCS format', async () => {
      mockCreate.mockResolvedValue(mockCdamResponse);

      const result: UploadResult = await DocumentUploadService.uploadAndSubmitDocument(
        mockRequest as unknown as Request,
        mockCaseReference
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Document uploaded to CDAM and transformed to PCS format successfully');
      expect(result.caseReference).toBe(mockCaseReference);
      expect(result.document).toEqual(mockCdamResponse[0]);
      expect(result.documents).toEqual(mockCdamResponse);
      expect(result.documentId).toBe('doc-123');
    });

    it('should call CaseDocumentManagementClient with correct parameters', async () => {
      mockCreate.mockResolvedValue(mockCdamResponse);

      await DocumentUploadService.uploadAndSubmitDocument(mockRequest as unknown as Request, mockCaseReference);

      expect(CaseDocumentManagementClient).toHaveBeenCalledWith(mockCaseReference, {
        accessToken: mockUser.accessToken,
        id: mockUser.sub,
        email: mockUser.email,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        files: mockRequest.files,
        classification: Classification.Public,
      });
    });

    it('should return error when user is not authenticated', async () => {
      const requestWithoutUser: MockRequest = {
        ...mockRequest,
        session: {},
      } as MockRequest;

      const result: UploadResult = await DocumentUploadService.uploadAndSubmitDocument(
        requestWithoutUser as unknown as Request,
        mockCaseReference
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return error when no files are uploaded', async () => {
      const requestWithoutFiles: MockRequest = {
        ...mockRequest,
        files: {},
      };

      const result: UploadResult = await DocumentUploadService.uploadAndSubmitDocument(
        requestWithoutFiles as unknown as Request,
        mockCaseReference
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('No files uploaded');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return error when CDAM upload fails', async () => {
      mockCreate.mockRejectedValue(new Error('CDAM service unavailable'));

      const result: UploadResult = await DocumentUploadService.uploadAndSubmitDocument(
        mockRequest as unknown as Request,
        mockCaseReference
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('CDAM service unavailable');
    });

    it('should handle multiple document uploads', async () => {
      const multipleDocsCdamResponse: DocumentManagementFile[] = [
        mockCdamResponse[0],
        {
          ...mockCdamResponse[0],
          originalDocumentName: 'test2.pdf',
          _links: {
            self: { href: 'http://dm-store.example.com/documents/doc-456' },
            binary: { href: 'http://dm-store.example.com/documents/doc-456/binary' },
          },
        },
      ];

      mockCreate.mockResolvedValue(multipleDocsCdamResponse);

      const result: UploadResult = await DocumentUploadService.uploadAndSubmitDocument(
        mockRequest as unknown as Request,
        mockCaseReference
      );

      expect(result.success).toBe(true);
      expect(result.documents).toHaveLength(2);
      expect(result.document).toEqual(multipleDocsCdamResponse[0]);
      expect(result.documentId).toBe('doc-123');
    });

    it('should extract correct document ID from CDAM response links', async () => {
      const customCdamResponse: DocumentManagementFile[] = [
        {
          ...mockCdamResponse[0],
          _links: {
            self: {
              href: 'http://dm-store.example.com/documents/custom-doc-id-999',
            },
            binary: {
              href: 'http://dm-store.example.com/documents/custom-doc-id-999/binary',
            },
          },
        },
      ];

      mockCreate.mockResolvedValue(customCdamResponse);

      const result: UploadResult = await DocumentUploadService.uploadAndSubmitDocument(
        mockRequest as unknown as Request,
        mockCaseReference
      );

      expect(result.documentId).toBe('custom-doc-id-999');
    });
  });
});
