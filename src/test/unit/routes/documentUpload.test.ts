import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';
import type { UploadedFile } from 'express-fileupload';

import { oidcMiddleware } from '../../../main/middleware';
import documentUploadRoute from '../../../main/routes/documentUpload';
import { ccdCaseService } from '../../../main/services/ccdCaseService';
import { cdamService } from '../../../main/services/cdamService';
import type { CaseDocument, DocumentManagementFile } from '../../../types/global';

jest.mock('../../../main/middleware');
jest.mock('../../../main/services/ccdCaseService');
jest.mock('../../../main/services/cdamService');
jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn().mockReturnValue({
      error: jest.fn(),
      info: jest.fn(),
    }),
  },
}));

type MockApp = {
  get: jest.Mock;
  post: jest.Mock;
};

type MockSession = {
  uploadedDocuments?: CaseDocument[];
  user?: {
    accessToken?: string;
    uid?: string;
  };
  save: jest.Mock;
};

type MockRequest = {
  session: MockSession;
  files?: {
    documents?: UploadedFile | UploadedFile[];
  };
};

type MockResponse = {
  render: jest.Mock;
  redirect: jest.Mock;
  status: jest.Mock;
};

describe('Document Upload Route', () => {
  let mockApp: MockApp;
  let mockGet: jest.Mock;
  let mockPost: jest.Mock;
  let mockLogger: {
    error: jest.Mock;
    info: jest.Mock;
  };

  beforeEach(() => {
    mockGet = jest.fn();
    mockPost = jest.fn();
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
    };

    mockApp = {
      get: mockGet,
      post: mockPost,
    };

    jest.clearAllMocks();
    (Logger.getLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  it('should register all routes', () => {
    documentUploadRoute(mockApp as unknown as Application);

    expect(mockGet).toHaveBeenCalledWith('/upload-documents', oidcMiddleware, expect.any(Function));
    expect(mockPost).toHaveBeenCalledWith('/upload-documents', oidcMiddleware, expect.any(Function));
    expect(mockGet).toHaveBeenCalledWith('/upload-success', oidcMiddleware, expect.any(Function));
    expect(mockPost).toHaveBeenCalledWith('/submit-to-ccd', oidcMiddleware, expect.any(Function));
    expect(mockGet).toHaveBeenCalledWith('/ccd-success', oidcMiddleware, expect.any(Function));
  });

  describe('GET /upload-documents', () => {
    let mockReq: MockRequest;
    let mockRes: MockResponse;

    beforeEach(() => {
      mockReq = {
        session: {
          save: jest.fn(),
        },
      };

      mockRes = {
        render: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
    });

    it('should render upload-documents page with empty array when no documents', () => {
      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.render).toHaveBeenCalledWith('upload-documents', {
        uploadedDocuments: [],
      });
    });

    it('should render upload-documents page with existing uploaded documents', () => {
      const uploadedDocs: CaseDocument[] = [
        {
          id: 'doc1',
          value: {
            documentType: 'LETTER_FROM_CLAIMANT',
            document: {
              document_url: 'http://example.com/doc1',
              document_filename: 'test.pdf',
              document_binary_url: 'http://example.com/doc1/binary',
            },
            description: null,
          },
        },
      ];

      mockReq.session.uploadedDocuments = uploadedDocs;

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.render).toHaveBeenCalledWith('upload-documents', {
        uploadedDocuments: uploadedDocs,
      });
    });

    it('should handle errors and render error page', () => {
      const renderError = new Error('Render error');
      mockRes.render
        .mockImplementationOnce(() => {
          throw renderError;
        })
        .mockImplementationOnce(jest.fn()); // Second call for error page

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[0][2];
      routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.render).toHaveBeenCalledWith('error', { message: 'Render error' });
    });
  });

  describe('POST /upload-documents', () => {
    let mockReq: MockRequest;
    let mockRes: MockResponse;

    beforeEach(() => {
      mockReq = {
        session: {
          save: jest.fn((callback: (err?: Error) => void) => callback()),
          user: {
            accessToken: 'test-token',
            uid: 'user123',
          },
        },
        files: undefined,
      };

      mockRes = {
        render: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
    });

    it('should return 400 when no files are uploaded', async () => {
      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockPost.mock.calls[0][2];
      await routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.render).toHaveBeenCalledWith('upload-documents', {
        error: 'No files were uploaded',
        uploadedDocuments: [],
      });
    });

    it('should return 401 when user session is missing auth data', async () => {
      mockReq.files = {
        documents: {
          name: 'test.pdf',
          data: Buffer.from('test'),
          mimetype: 'application/pdf',
        } as UploadedFile,
      };
      mockReq.session.user = undefined;

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockPost.mock.calls[0][2];
      const result = await routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.render).toHaveBeenCalledWith('error', { message: 'Authentication required' });
      expect(result).toBeUndefined(); // Route returns early
    });

    it('should upload single file and redirect to success page', async () => {
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

      mockReq.files = {
        documents: mockFile,
      };

      const mockCdamResponse: DocumentManagementFile[] = [
        {
          originalDocumentName: 'test.pdf',
          _links: {
            self: {
              href: 'http://example.com/documents/123',
            },
            binary: {
              href: 'http://example.com/documents/123/binary',
            },
          },
          description: 'Test document',
        },
      ];

      (cdamService.uploadDocuments as jest.Mock).mockResolvedValue(mockCdamResponse);

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockPost.mock.calls[0][2];
      await routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(cdamService.uploadDocuments).toHaveBeenCalledWith(mockFile, 'user123', 'test-token');
      expect(mockReq.session.save).toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith('/upload-success');
    });

    it('should upload multiple files and redirect to success page', async () => {
      const mockFiles: UploadedFile[] = [
        {
          name: 'test1.pdf',
          data: Buffer.from('test1'),
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
          data: Buffer.from('test2'),
          mimetype: 'application/pdf',
          size: 5678,
          encoding: 'utf-8',
          tempFilePath: '',
          truncated: false,
          md5: 'hash2',
          mv: jest.fn(),
        },
      ];

      mockReq.files = {
        documents: mockFiles,
      };

      const mockCdamResponse: DocumentManagementFile[] = [
        {
          originalDocumentName: 'test1.pdf',
          _links: {
            self: { href: 'http://example.com/documents/123' },
            binary: { href: 'http://example.com/documents/123/binary' },
          },
        },
        {
          originalDocumentName: 'test2.pdf',
          _links: {
            self: { href: 'http://example.com/documents/456' },
            binary: { href: 'http://example.com/documents/456/binary' },
          },
        },
      ];

      (cdamService.uploadDocuments as jest.Mock).mockResolvedValue(mockCdamResponse);

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockPost.mock.calls[0][2];
      await routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(cdamService.uploadDocuments).toHaveBeenCalledWith(mockFiles, 'user123', 'test-token');
      expect(mockReq.session.uploadedDocuments).toHaveLength(2);
      expect(mockRes.redirect).toHaveBeenCalledWith('/upload-success');
    });

    it('should handle session save error', async () => {
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

      mockReq.files = {
        documents: mockFile,
      };

      const mockCdamResponse: DocumentManagementFile[] = [
        {
          originalDocumentName: 'test.pdf',
          _links: {
            self: { href: 'http://example.com/documents/123' },
            binary: { href: 'http://example.com/documents/123/binary' },
          },
        },
      ];

      (cdamService.uploadDocuments as jest.Mock).mockResolvedValue(mockCdamResponse);
      const saveError = new Error('Save failed');
      mockReq.session.save = jest.fn((callback: (err?: Error) => void) => callback(saveError));

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockPost.mock.calls[0][2];
      const result = await routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.render).toHaveBeenCalledWith('error', { message: 'Failed to save upload session' });
      expect(result).toBeUndefined(); // Route returns early
    });

    it('should handle CDAM upload error', async () => {
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

      mockReq.files = {
        documents: mockFile,
      };

      const uploadError = new Error('CDAM upload failed');
      (cdamService.uploadDocuments as jest.Mock).mockRejectedValue(uploadError);

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockPost.mock.calls[0][2];
      await routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.render).toHaveBeenCalledWith('upload-documents', {
        error: 'CDAM upload failed',
        uploadedDocuments: [],
      });
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

      mockReq.files = {
        documents: mockFile,
      };

      (cdamService.uploadDocuments as jest.Mock).mockRejectedValue('String error');

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockPost.mock.calls[0][2];
      await routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.render).toHaveBeenCalledWith('upload-documents', {
        error: 'Failed to upload documents',
        uploadedDocuments: [],
      });
    });
  });

  describe('GET /upload-success', () => {
    let mockReq: MockRequest;
    let mockRes: MockResponse;

    beforeEach(() => {
      mockReq = {
        session: {
          save: jest.fn(),
        },
      };

      mockRes = {
        render: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
    });

    it('should render upload-success page with uploaded documents', () => {
      const uploadedDocs: CaseDocument[] = [
        {
          id: 'doc1',
          value: {
            documentType: 'LETTER_FROM_CLAIMANT',
            document: {
              document_url: 'http://example.com/doc1',
              document_filename: 'test.pdf',
              document_binary_url: 'http://example.com/doc1/binary',
            },
            description: null,
          },
        },
      ];

      mockReq.session.uploadedDocuments = uploadedDocs;

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[1][2];
      routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.render).toHaveBeenCalledWith('upload-success', {
        uploadedDocuments: uploadedDocs,
      });
    });

    it('should render upload-success page with empty array when no documents', () => {
      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[1][2];
      routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.render).toHaveBeenCalledWith('upload-success', {
        uploadedDocuments: [],
      });
    });

    it('should handle errors and render error page', () => {
      const renderError = new Error('Render error');
      mockRes.render
        .mockImplementationOnce(() => {
          throw renderError;
        })
        .mockImplementationOnce(jest.fn()); // Second call for error page

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[1][2];
      routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.render).toHaveBeenCalledWith('error', { message: 'Render error' });
    });
  });

  describe('POST /submit-to-ccd', () => {
    let mockReq: MockRequest;
    let mockRes: MockResponse;

    beforeEach(() => {
      mockReq = {
        session: {
          save: jest.fn((callback: (err?: Error) => void) => callback()),
          user: {
            accessToken: 'test-token',
          },
          uploadedDocuments: [
            {
              id: 'doc1',
              value: {
                documentType: 'LETTER_FROM_CLAIMANT',
                document: {
                  document_url: 'http://example.com/doc1',
                  document_filename: 'test.pdf',
                  document_binary_url: 'http://example.com/doc1/binary',
                },
                description: null,
              },
            },
          ],
        },
      };

      mockRes = {
        render: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
    });

    it('should submit documents to CCD and redirect to ccd-success', async () => {
      const initialDocs = mockReq.session.uploadedDocuments;
      (ccdCaseService.updateCaseDocuments as jest.Mock).mockResolvedValue({});

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockPost.mock.calls[1][2];
      await routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(ccdCaseService.updateCaseDocuments).toHaveBeenCalledWith('test-token', expect.any(String), initialDocs);
      expect(mockReq.session.uploadedDocuments).toEqual([]);
      expect(mockRes.redirect).toHaveBeenCalledWith('/ccd-success');
    });

    it('should return 401 when user session is missing auth data', async () => {
      mockReq.session.user = undefined;

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockPost.mock.calls[1][2];
      const result = await routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.render).toHaveBeenCalledWith('error', { message: 'Authentication required' });
      expect(result).toBeUndefined(); // Route returns early
    });

    it('should return 400 when no documents to submit', async () => {
      mockReq.session.uploadedDocuments = [];

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockPost.mock.calls[1][2];
      await routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.render).toHaveBeenCalledWith('upload-success', {
        error: 'No documents to submit',
        uploadedDocuments: [],
      });
    });

    it('should handle session save error', async () => {
      (ccdCaseService.updateCaseDocuments as jest.Mock).mockResolvedValue({});
      const saveError = new Error('Save failed');
      mockReq.session.save = jest.fn((callback: (err?: Error) => void) => callback(saveError));

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockPost.mock.calls[1][2];
      const result = await routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.render).toHaveBeenCalledWith('error', { message: 'Failed to save session' });
      expect(result).toBeUndefined(); // Route returns early
    });

    it('should handle CCD submission error', async () => {
      const ccdError = new Error('CCD submission failed');
      (ccdCaseService.updateCaseDocuments as jest.Mock).mockRejectedValue(ccdError);

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockPost.mock.calls[1][2];
      await routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.render).toHaveBeenCalledWith('upload-success', {
        error: 'CCD submission failed',
        uploadedDocuments: expect.any(Array),
      });
    });

    it('should handle non-Error type exceptions', async () => {
      (ccdCaseService.updateCaseDocuments as jest.Mock).mockRejectedValue('String error');

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockPost.mock.calls[1][2];
      await routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.render).toHaveBeenCalledWith('upload-success', {
        error: 'Failed to submit documents to CCD',
        uploadedDocuments: expect.any(Array),
      });
    });
  });

  describe('GET /ccd-success', () => {
    let mockReq: MockRequest;
    let mockRes: MockResponse;

    beforeEach(() => {
      mockReq = {
        session: {
          save: jest.fn(),
        },
      };

      mockRes = {
        render: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
    });

    it('should render ccd-success page', () => {
      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[2][2];
      routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.render).toHaveBeenCalledWith('ccd-success');
    });

    it('should handle errors and render error page', () => {
      const renderError = new Error('Render error');
      mockRes.render
        .mockImplementationOnce(() => {
          throw renderError;
        })
        .mockImplementationOnce(jest.fn()); // Second call for error page

      documentUploadRoute(mockApp as unknown as Application);
      const routeHandler = mockGet.mock.calls[2][2];
      routeHandler(mockReq as unknown as Request, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.render).toHaveBeenCalledWith('error', { message: 'Render error' });
    });
  });
});
