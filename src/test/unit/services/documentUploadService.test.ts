import { Request } from 'express';
import { UploadedFile } from 'express-fileupload';

import { CaseDocumentManagementClient } from '../../../main/app/document/CaseDocumentManagementClient';
import { CaseDocument } from '../../../main/interfaces/caseDocument.interface';
import { Classification, DocumentManagementFile } from '../../../main/interfaces/documentManagement.interface';
import { ccdCaseService } from '../../../main/services/ccdCaseService';
import { DocumentUploadService, UploadResult } from '../../../main/services/documentUploadService';

jest.mock('../../../main/app/document/CaseDocumentManagementClient');
jest.mock('../../../main/services/ccdCaseService');

const mockCreate = jest.fn();
const mockUpdateCase = jest.fn();

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
};

describe('DocumentUploadService', () => {
  let mockRequest: MockRequest;
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
    } as MockRequest;

    (CaseDocumentManagementClient as jest.Mock).mockImplementation(() => ({
      create: mockCreate,
    }));

    (ccdCaseService.updateCase as jest.Mock) = mockUpdateCase;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadDocumentToCDAM (Stage 1)', () => {
    const mockCdamResponse: DocumentManagementFile[] = [
      {
        size: 1024,
        mimeType: 'application/pdf',
        originalDocumentName: 'test.pdf',
        modifiedOn: '2025-10-17T10:00:00.000Z',
        createdOn: '2025-10-17T10:00:00.000Z',
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

    it('should successfully upload document to CDAM', async () => {
      mockCreate.mockResolvedValue(mockCdamResponse);

      const result: UploadResult = await DocumentUploadService.uploadDocumentToCDAM(mockRequest as Request);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Documents uploaded to CDAM successfully');
      expect(result.document).toEqual(mockCdamResponse[0]);
      expect(result.documents).toEqual(mockCdamResponse);
      expect(result.documentId).toBe('doc-123');
    });

    it('should call CaseDocumentManagementClient without caseReference', async () => {
      mockCreate.mockResolvedValue(mockCdamResponse);

      await DocumentUploadService.uploadDocumentToCDAM(mockRequest as Request);

      expect(CaseDocumentManagementClient).toHaveBeenCalledWith({
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

      const result: UploadResult = await DocumentUploadService.uploadDocumentToCDAM(requestWithoutUser as Request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return error when CDAM upload fails', async () => {
      mockCreate.mockRejectedValue(new Error('CDAM service unavailable'));

      const result: UploadResult = await DocumentUploadService.uploadDocumentToCDAM(mockRequest as Request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('CDAM service unavailable');
    });
  });

  describe('submitDocumentToCase (Stage 2)', () => {
    const mockCaseReference = '1234567890123456';
    const mockDocumentReferences: CaseDocument[] = [
      {
        id: 'doc-123',
        value: {
          documentType: 'CUI_DOC_UPLOAD_POC',
          description: null,
          document: {
            document_url: 'http://dm-store.example.com/documents/doc-123',
            document_filename: 'test.pdf',
            document_binary_url: 'http://dm-store.example.com/documents/doc-123/binary',
          },
        },
      },
    ];

    it('should successfully associate documents with case', async () => {
      const mockCcdResponse = {
        id: mockCaseReference,
        data: {
          supportingDocuments: mockDocumentReferences,
        },
      };

      mockUpdateCase.mockResolvedValue(mockCcdResponse);

      const result: UploadResult = await DocumentUploadService.submitDocumentToCase(
        mockUser.accessToken,
        mockDocumentReferences,
        mockCaseReference
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Documents associated with case successfully');
      expect(result.caseReference).toBe(mockCaseReference);
    });

    it('should call ccdCaseService.updateCase with correct parameters', async () => {
      const mockCcdResponse = {
        id: mockCaseReference,
        data: {
          supportingDocuments: mockDocumentReferences,
        },
      };

      mockUpdateCase.mockResolvedValue(mockCcdResponse);

      await DocumentUploadService.submitDocumentToCase(mockUser.accessToken, mockDocumentReferences, mockCaseReference);

      expect(mockUpdateCase).toHaveBeenCalledWith(mockUser.accessToken, {
        id: mockCaseReference,
        data: {
          supportingDocuments: mockDocumentReferences,
        },
      });
    });

    it('should return error when CCD update fails', async () => {
      mockUpdateCase.mockRejectedValue(new Error('CCD service unavailable'));

      const result: UploadResult = await DocumentUploadService.submitDocumentToCase(
        mockUser.accessToken,
        mockDocumentReferences,
        mockCaseReference
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('CCD service unavailable');
    });
  });
});
