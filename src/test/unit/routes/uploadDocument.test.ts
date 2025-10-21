import express, { Application } from 'express';
import request from 'supertest';

import { CaseDocument } from '../../../main/interfaces/caseDocument.interface';
import { Classification, DocumentManagementFile } from '../../../main/interfaces/documentManagement.interface';
import uploadDocumentRoute from '../../../main/routes/uploadDocument';
import { DocumentUploadService, UploadResult } from '../../../main/services/documentUploadService';

jest.mock('../../../main/services/documentUploadService');
jest.mock('../../../main/middleware/oidc', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

describe('uploadDocument routes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock session middleware for authenticated endpoints
    app.use((req, res, next) => {
      req.session = {
        user: {
          accessToken: 'mock-token',
          sub: 'user-123',
          email: 'test@example.com',
        },
      } as never;
      next();
    });

    uploadDocumentRoute(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /uploadDocPoc/page2/uploadDocument (Stage 1 - CDAM Upload)', () => {
    it('should successfully upload document to CDAM', async () => {
      const mockDocuments: DocumentManagementFile[] = [
        {
          originalDocumentName: 'test.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          modifiedOn: '2025-10-17T10:00:00.000Z',
          createdOn: '2025-10-17T10:00:00.000Z',
          classification: Classification.Public,
          _links: {
            self: { href: 'http://dm-store.example.com/documents/doc-123' },
            binary: { href: 'http://dm-store.example.com/documents/doc-123/binary' },
          },
        },
      ];

      const mockResult: UploadResult = {
        success: true,
        message: 'Documents uploaded to CDAM successfully',
        documents: mockDocuments,
        document: mockDocuments[0],
        documentId: 'doc-123',
      };

      jest.spyOn(DocumentUploadService, 'uploadDocumentToCDAM').mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/uploadDocPoc/page2/uploadDocument')
        .attach('upload', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(DocumentUploadService.uploadDocumentToCDAM).toHaveBeenCalled();
    });

    it('should return 500 error when CDAM upload fails', async () => {
      const mockResult: UploadResult = {
        success: false,
        error: 'CDAM service unavailable',
      };

      jest.spyOn(DocumentUploadService, 'uploadDocumentToCDAM').mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/uploadDocPoc/page2/uploadDocument')
        .attach('upload', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'CDAM upload failed',
        message: 'CDAM service unavailable',
      });
    });
  });

  describe('POST /uploadDocPoc/page2/submitDocument (Stage 2 - CCD Association)', () => {
    it('should successfully associate documents with case', async () => {
      const documentReferences: CaseDocument[] = [
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

      const mockResult: UploadResult = {
        success: true,
        message: 'Documents associated with case successfully',
        caseReference: '1234567890123456',
      };

      jest.spyOn(DocumentUploadService, 'submitDocumentToCase').mockResolvedValue(mockResult);

      const response = await request(app).post('/uploadDocPoc/page2/submitDocument').send({
        documentReferences,
        caseReference: '1234567890123456',
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(DocumentUploadService.submitDocumentToCase).toHaveBeenCalled();
    });

    it('should return 500 error when CCD association fails', async () => {
      const documentReferences: CaseDocument[] = [
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

      const mockResult: UploadResult = {
        success: false,
        error: 'CCD service unavailable',
      };

      jest.spyOn(DocumentUploadService, 'submitDocumentToCase').mockResolvedValue(mockResult);

      const response = await request(app).post('/uploadDocPoc/page2/submitDocument').send({
        documentReferences,
        caseReference: '1234567890123456',
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'CCD association failed',
        message: 'CCD service unavailable',
      });
    });
  });
});
