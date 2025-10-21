import express, { Application } from 'express';
import request from 'supertest';

import { DEFAULT_CASE_REFERENCE } from '../../../main/config/constants';
import { Classification, DocumentManagementFile } from '../../../main/interfaces/documentManagement.interface';
import uploadDocumentRoute from '../../../main/routes/uploadDocument';
import { DocumentUploadService, UploadResult } from '../../../main/services/documentUploadService';

jest.mock('../../../main/services/documentUploadService');
jest.mock('../../../main/middleware/oidc', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

describe('uploadDocument route', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    uploadDocumentRoute(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /uploadDocPoc/page2/upload', () => {
    it('should successfully upload and transform document', async () => {
      const mockDocuments: DocumentManagementFile[] = [
        {
          originalDocumentName: 'test.pdf',
          size: 1024,
          mimeType: 'application/pdf',
          modifiedOn: '2025-10-08T10:00:00.000Z',
          createdOn: '2025-10-08T10:00:00.000Z',
          classification: Classification.Public,
          _links: {
            self: { href: 'http://dm-store.example.com/documents/doc-123' },
            binary: { href: 'http://dm-store.example.com/documents/doc-123/binary' },
          },
        },
      ];

      const mockResult: UploadResult = {
        success: true,
        message: 'Document uploaded to CDAM and transformed to PCS format successfully',
        caseReference: '1234567890123456',
        documents: mockDocuments,
        document: mockDocuments[0],
        documentId: 'doc-123',
      };

      jest.spyOn(DocumentUploadService, 'uploadAndSubmitDocument').mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/uploadDocPoc/page2/upload')
        .field('caseReference', '1234567890123456')
        .attach('upload', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(DocumentUploadService.uploadAndSubmitDocument).toHaveBeenCalled();
    });

    it('should use DEFAULT_CASE_REFERENCE when caseReference is not provided', async () => {
      const mockResult: UploadResult = {
        success: true,
        message: 'Document uploaded successfully',
        caseReference: DEFAULT_CASE_REFERENCE,
      };

      jest.spyOn(DocumentUploadService, 'uploadAndSubmitDocument').mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/uploadDocPoc/page2/upload')
        .field('someOtherField', 'value')
        .attach('upload', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(DocumentUploadService.uploadAndSubmitDocument).toHaveBeenCalledWith(
        expect.anything(),
        DEFAULT_CASE_REFERENCE
      );
    });

    it('should return 500 error when upload fails', async () => {
      const mockResult: UploadResult = {
        success: false,
        error: 'CDAM service unavailable',
      };

      jest.spyOn(DocumentUploadService, 'uploadAndSubmitDocument').mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/uploadDocPoc/page2/upload')
        .field('caseReference', '1234567890123456')
        .attach('upload', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Upload and submit failed',
        message: 'CDAM service unavailable',
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      jest.spyOn(DocumentUploadService, 'uploadAndSubmitDocument').mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .post('/uploadDocPoc/page2/upload')
        .field('caseReference', '1234567890123456')
        .attach('upload', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Upload and submit failed',
        message: 'Unexpected error',
      });
    });

    it('should handle errors without message property', async () => {
      jest.spyOn(DocumentUploadService, 'uploadAndSubmitDocument').mockRejectedValue('String error');

      const response = await request(app)
        .post('/uploadDocPoc/page2/upload')
        .field('caseReference', '1234567890123456')
        .attach('upload', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Upload and submit failed',
        message: 'Unknown error occurred',
      });
    });

    it('should handle multiple file uploads', async () => {
      const mockResult: UploadResult = {
        success: true,
        message: 'Documents uploaded successfully',
        caseReference: '1234567890123456',
      };

      jest.spyOn(DocumentUploadService, 'uploadAndSubmitDocument').mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/uploadDocPoc/page2/upload')
        .field('caseReference', '1234567890123456')
        .attach('upload', Buffer.from('test1'), 'test1.pdf')
        .attach('upload', Buffer.from('test2'), 'test2.pdf');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(DocumentUploadService.uploadAndSubmitDocument).toHaveBeenCalled();
    });
  });
});
