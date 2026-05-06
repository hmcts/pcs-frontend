jest.mock('multer', () => {
  class MockMulterError extends Error {
    code: string;
    field?: string;
    constructor(code: string, field?: string) {
      super(code);
      this.code = code;
      this.field = field;
      this.name = 'MulterError';
    }
  }

  const mockSingle = jest.fn((_field: string) => (req: unknown, _res: unknown, cb: (err: unknown) => void) => {
    cb((req as { __mockMulterErr?: unknown }).__mockMulterErr);
  });

  const multerFactory = jest.fn(() => ({ single: mockSingle })) as unknown as {
    (opts?: unknown): { single: jest.Mock };
    MulterError: typeof MockMulterError;
    default: unknown;
  };
  multerFactory.MulterError = MockMulterError;
  multerFactory.default = multerFactory;

  return multerFactory;
});

jest.mock('../../../main/modules/logger', () => {
  const loggerInstance = { error: jest.fn(), info: jest.fn(), warn: jest.fn() };
  return { Logger: { getLogger: jest.fn(() => loggerInstance) } };
});

jest.mock('../../../main/services/cdamService', () => ({
  uploadDocument: jest.fn(),
  deleteDocument: jest.fn(),
  getDocumentBinary: jest.fn(),
}));

jest.mock('../../../main/steps/index', () => ({
  findStep: jest.fn(),
  journeyForSlug: jest.fn(),
  getUserVariant: jest.fn().mockReturnValue('default'),
}));

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

import type { Application, Request, Response } from 'express';
import multer from 'multer';

import documentProxyRoutes, { fileFilter, handleMulterError } from '../../../main/routes/documentProxy';

import { deleteDocument, uploadDocument } from '@services/cdamService';

const mockUploadDocument = uploadDocument as jest.Mock;
const mockDeleteDocument = deleteDocument as jest.Mock;

const mockT = (key: string, opts?: Record<string, unknown>) =>
  opts?.filename !== undefined ? `${key}:${opts.filename as string}` : key;

// Build a DocumentStorage adapter mock and wire the findStep mock to return it.
// Tests that want to simulate specific state drive it via mockReadFresh.mockResolvedValueOnce.
function makeStorageMock(initialDocs: unknown[] = []) {
  const mockRead = jest.fn().mockResolvedValue(initialDocs);
  const mockReadFresh = jest.fn().mockResolvedValue(initialDocs);
  const mockSave = jest.fn().mockResolvedValue(undefined);

  const { findStep } = require('../../../main/steps/index');
  (findStep as jest.Mock).mockReturnValue({
    documentStorage: { read: mockRead, readFresh: mockReadFresh, save: mockSave },
  });

  return { mockRead, mockReadFresh, mockSave };
}

function makeReqWithDocs(overrides: Record<string, unknown>, docs: unknown[] = []) {
  makeStorageMock(docs);
  return {
    session: { user: { accessToken: 'token' } },
    params: { caseReference: '123456', journey: 'respond-to-claim', step: 'upload-document' },
    t: mockT,
    res: {
      locals: {
        validatedCase: {
          possessionClaimResponse: {
            defendantResponses: { defendantDocuments: docs },
          },
        },
      },
    },
    ...overrides,
  } as unknown as Request;
}

const existingDoc = {
  id: 'existing-doc-id',
  value: {
    document: {
      document_url: 'http://dm/doc/existing-uuid',
      document_binary_url: 'http://dm/doc/existing-uuid/binary',
      document_filename: 'existing.pdf',
    },
    contentType: 'application/pdf',
    size: 500,
  },
};

describe('documentProxyRoutes', () => {
  let mockApp: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    makeStorageMock([]);
    mockApp = {
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as Application;

    documentProxyRoutes(mockApp);
  });

  it('registers journey-agnostic upload, delete and document download routes', () => {
    expect(mockApp.get).toHaveBeenCalledWith(
      '/case/:caseReference/:journey/:step/document/:index',
      expect.anything(),
      expect.anything()
    );
    expect(mockApp.post).toHaveBeenCalledWith(
      '/case/:caseReference/:journey/:step/upload',
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
    expect(mockApp.post).toHaveBeenCalledWith(
      '/case/:caseReference/:journey/:step/delete',
      expect.anything(),
      expect.anything()
    );
  });

  describe('document download handler', () => {
    let handler: (req: Request, res: Response) => Promise<void>;

    beforeEach(() => {
      const getCalls = (mockApp.get as jest.Mock).mock.calls;
      const downloadCall = getCalls.find((c: unknown[]) => (c[0] as string).includes('/document/:index'));
      handler = downloadCall[downloadCall.length - 1];
    });

    it('returns 404 for invalid index', async () => {
      const req = makeReqWithDocs({
        params: { caseReference: '123456', journey: 'respond-to-claim', step: 'upload-document', index: 'abc' },
      });
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when index out of range', async () => {
      const req = makeReqWithDocs(
        { params: { caseReference: '123456', journey: 'respond-to-claim', step: 'upload-document', index: '5' } },
        [existingDoc]
      );
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('streams document with security headers using server-side CDAM URL', async () => {
      const { getDocumentBinary } = require('@services/cdamService');
      const mockStream = { pipe: jest.fn(), on: jest.fn() };
      (getDocumentBinary as jest.Mock).mockResolvedValue({ stream: mockStream, contentType: 'application/pdf' });

      const req = makeReqWithDocs(
        { params: { caseReference: '123456', journey: 'respond-to-claim', step: 'upload-document', index: '0' } },
        [existingDoc]
      );
      const res = {
        setHeader: jest.fn(),
        headersSent: false,
      } as unknown as Response;

      await handler(req, res);

      expect(getDocumentBinary).toHaveBeenCalledWith('http://dm/doc/existing-uuid/binary', 'token');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="existing.pdf"');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', 'sandbox');
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockStream.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockStream.pipe).toHaveBeenCalledWith(res);
    });

    it('returns 502 when CDAM fails', async () => {
      const { getDocumentBinary } = require('@services/cdamService');
      (getDocumentBinary as jest.Mock).mockRejectedValue(new Error('CDAM down'));

      const req = makeReqWithDocs(
        { params: { caseReference: '123456', journey: 'respond-to-claim', step: 'upload-document', index: '0' } },
        [existingDoc]
      );
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
    });
  });

  describe('fileFilter', () => {
    it('accepts valid file types', () => {
      const cb = jest.fn();
      const file = { mimetype: 'application/pdf', originalname: 'test.pdf' } as Express.Multer.File;
      fileFilter({} as Request, file, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('rejects blocked media with BLOCKED_MEDIA error', () => {
      const cb = jest.fn();
      const file = { mimetype: 'video/mp4', originalname: 'video.mp4' } as Express.Multer.File;
      fileFilter({} as Request, file, cb);
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ message: 'BLOCKED_MEDIA' }));
    });

    it('rejects invalid file types with INVALID_FILE_TYPE error', () => {
      const cb = jest.fn();
      const file = { mimetype: 'application/x-executable', originalname: 'malware.exe' } as Express.Multer.File;
      fileFilter({} as Request, file, cb);
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ message: 'INVALID_FILE_TYPE' }));
    });
  });

  describe('handleMulterError', () => {
    it('calls next when no error', () => {
      const next = jest.fn();
      handleMulterError(null, {} as Request, {} as Response, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('returns 400 with tooLarge for file size limit', () => {
      const err = new multer.MulterError('LIMIT_FILE_SIZE');
      const req = { t: mockT } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      handleMulterError(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 with wrongType for INVALID_FILE_TYPE', () => {
      const err = new Error('INVALID_FILE_TYPE');
      const req = { t: mockT } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      handleMulterError(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 with wrongType for BLOCKED_MEDIA', () => {
      const err = new Error('BLOCKED_MEDIA');
      const req = { t: mockT } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      handleMulterError(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('passes unknown errors to next', () => {
      const err = new Error('SOMETHING_ELSE');
      const req = { t: mockT } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      handleMulterError(err, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('passes non-LIMIT_FILE_SIZE MulterError to next', () => {
      const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
      const req = { t: mockT } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      handleMulterError(err, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('upload multer wrapper middleware', () => {
    let middleware: (req: Request, res: Response, next: (err?: unknown) => void) => void;

    beforeEach(() => {
      const postCalls = (mockApp.post as jest.Mock).mock.calls;
      const uploadCall = postCalls.find((c: unknown[]) => (c[0] as string).includes('/upload'));
      // [0]=path, [1]=oidcMiddleware, [2]=multer wrapper, [3]=final handler
      middleware = uploadCall[2];
    });

    it('calls next() when multer completes without error', () => {
      const req = { t: mockT } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('forwards LIMIT_FILE_SIZE via handleMulterError (400)', () => {
      const err = new multer.MulterError('LIMIT_FILE_SIZE');
      const req = { t: mockT, __mockMulterErr: err } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('upload handler', () => {
    let handler: (req: Request, res: Response) => Promise<void>;

    beforeEach(() => {
      const postCalls = (mockApp.post as jest.Mock).mock.calls;
      const uploadCall = postCalls.find((c: unknown[]) => (c[0] as string).includes('/upload'));
      handler = uploadCall[uploadCall.length - 1];
    });

    it('returns 400 when no file uploaded', async () => {
      const req = makeReqWithDocs({ file: undefined });
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns index and filename on successful upload, no CDAM URLs', async () => {
      const mockDoc = {
        document_url: 'http://dm/doc/new-uuid',
        document_binary_url: 'http://dm/doc/new-uuid/binary',
        document_filename: 'test.pdf',
        content_type: 'application/pdf',
        size: 1024,
      };
      mockUploadDocument.mockResolvedValue(mockDoc);

      const req = makeReqWithDocs({
        file: { originalname: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from(''), size: 1024 },
      });
      const res = { json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(mockUploadDocument).toHaveBeenCalled();
      const response = res.json as jest.Mock;
      const body = response.mock.calls[0][0];

      expect(body.document.index).toBe(0);
      expect(body.document.document_filename).toBe('test.pdf');
      expect(body.document.document_url).toBeUndefined();
      expect(body.document.document_binary_url).toBeUndefined();
    });

    it('appends to existing documents via adapter save', async () => {
      const mockDoc = {
        document_url: 'http://dm/doc/new-uuid',
        document_binary_url: 'http://dm/doc/new-uuid/binary',
        document_filename: 'new.pdf',
        content_type: 'application/pdf',
        size: 2048,
      };
      mockUploadDocument.mockResolvedValue(mockDoc);

      const { mockReadFresh, mockSave } = makeStorageMock([existingDoc]);
      mockReadFresh.mockResolvedValue([existingDoc]);

      const req = makeReqWithDocs(
        { file: { originalname: 'new.pdf', mimetype: 'application/pdf', buffer: Buffer.from(''), size: 2048 } },
        [existingDoc]
      );
      // Rewire so the dynamic mock is in effect
      const { findStep } = require('../../../main/steps/index');
      (findStep as jest.Mock).mockReturnValue({
        documentStorage: { read: jest.fn().mockResolvedValue([existingDoc]), readFresh: mockReadFresh, save: mockSave },
      });

      const res = { json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(mockSave).toHaveBeenCalledWith(
        req,
        expect.arrayContaining([existingDoc, expect.objectContaining({ value: expect.any(Object) })])
      );

      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(body.document.index).toBe(1);
    });

    it('assigns a generated UUID id to the new collection item', async () => {
      mockUploadDocument.mockResolvedValue({
        document_url: 'http://dm/doc/new-uuid',
        document_binary_url: 'http://dm/doc/new-uuid/binary',
        document_filename: 'new.pdf',
        content_type: 'application/pdf',
        size: 2048,
      });

      const req = makeReqWithDocs({
        file: { originalname: 'new.pdf', mimetype: 'application/pdf', buffer: Buffer.from(''), size: 2048 },
      });

      // Override AFTER makeReqWithDocs so this mock wins
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const { findStep } = require('../../../main/steps/index');
      (findStep as jest.Mock).mockReturnValue({
        documentStorage: {
          read: jest.fn().mockResolvedValue([]),
          readFresh: jest.fn().mockResolvedValue([]),
          save: mockSave,
        },
      });

      const res = { json: jest.fn() } as unknown as Response;

      await handler(req, res);

      const savedDocs = (mockSave as jest.Mock).mock.calls[0][1];
      expect(savedDocs).toHaveLength(1);
      expect(savedDocs[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('returns 502 when cdamService throws', async () => {
      mockUploadDocument.mockRejectedValue(new Error('CDAM down'));

      const req = makeReqWithDocs({
        file: { originalname: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from(''), size: 1024 },
      });
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
    });

    it('returns 400 when total upload size exceeds 1024MB', async () => {
      const oneGbMinusOneByte = 1024 * 1024 * 1024 - 1;
      const hugeExistingDoc = {
        value: {
          document: {
            document_url: 'http://dm/doc/huge-uuid',
            document_binary_url: 'http://dm/doc/huge-uuid/binary',
            document_filename: 'huge.pdf',
          },
          contentType: 'application/pdf',
          size: oneGbMinusOneByte,
        },
      };

      const req = makeReqWithDocs(
        { file: { originalname: 'small.pdf', mimetype: 'application/pdf', buffer: Buffer.from(''), size: 10 } },
        [hugeExistingDoc]
      );
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockUploadDocument).not.toHaveBeenCalled();
    });
  });

  describe('delete handler', () => {
    let handler: (req: Request, res: Response) => Promise<void>;

    beforeEach(() => {
      const postCalls = (mockApp.post as jest.Mock).mock.calls;
      const deleteCall = postCalls.find((c: unknown[]) => (c[0] as string).includes('/delete'));
      handler = deleteCall[deleteCall.length - 1];
    });

    it('returns 404 when no index provided', async () => {
      const req = makeReqWithDocs({ body: {} });
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns success (idempotent) when docId is not found in fresh state', async () => {
      const req = makeReqWithDocs({ body: { delete: 'unknown-id' } }, [existingDoc]);
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(mockDeleteDocument).not.toHaveBeenCalled();
    });

    it('deletes by docId using server-side CDAM URL and saves via adapter', async () => {
      mockDeleteDocument.mockResolvedValue(undefined);

      const req = makeReqWithDocs({ body: { delete: 'existing-doc-id' } }, [existingDoc]);

      // Override AFTER makeReqWithDocs so this mock wins
      const mockReadFresh = jest.fn().mockResolvedValue([existingDoc]);
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const { findStep } = require('../../../main/steps/index');
      (findStep as jest.Mock).mockReturnValue({
        documentStorage: {
          read: jest.fn().mockResolvedValue([existingDoc]),
          readFresh: mockReadFresh,
          save: mockSave,
        },
      });

      const res = { json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(mockDeleteDocument).toHaveBeenCalledWith('http://dm/doc/existing-uuid', 'token');
      expect(mockSave).toHaveBeenCalledWith(req, []);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('returns 502 when delete fails', async () => {
      mockDeleteDocument.mockRejectedValue(new Error('CDAM down'));

      const mockReadFresh = jest.fn().mockResolvedValue([existingDoc]);
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const { findStep } = require('../../../main/steps/index');
      (findStep as jest.Mock).mockReturnValue({
        documentStorage: {
          read: jest.fn().mockResolvedValue([existingDoc]),
          readFresh: mockReadFresh,
          save: mockSave,
        },
      });

      const req = makeReqWithDocs({ body: { delete: 'existing-doc-id' } }, [existingDoc]);
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
    });

    it('returns 404 when delete docId is empty', async () => {
      const req = makeReqWithDocs({ body: { delete: '' } }, [existingDoc]);
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('logs non-Error rejections with String()', async () => {
      mockDeleteDocument.mockRejectedValue('string-error');

      const mockReadFresh = jest.fn().mockResolvedValue([existingDoc]);
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const { findStep } = require('../../../main/steps/index');
      (findStep as jest.Mock).mockReturnValue({
        documentStorage: {
          read: jest.fn().mockResolvedValue([existingDoc]),
          readFresh: mockReadFresh,
          save: mockSave,
        },
      });

      const req = makeReqWithDocs({ body: { delete: 'existing-doc-id' } }, [existingDoc]);
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
    });
  });

  describe('edge cases', () => {
    let uploadHandler: (req: Request, res: Response) => Promise<void>;
    let deleteHandler: (req: Request, res: Response) => Promise<void>;

    beforeEach(() => {
      const postCalls = (mockApp.post as jest.Mock).mock.calls;
      const uploadCall = postCalls.find((c: unknown[]) => (c[0] as string).includes('/upload'));
      const deleteCall = postCalls.find((c: unknown[]) => (c[0] as string).includes('/delete'));
      uploadHandler = uploadCall[uploadCall.length - 1];
      deleteHandler = deleteCall[deleteCall.length - 1];
    });

    it('upload: escapes HTML-unsafe characters in filename', async () => {
      mockUploadDocument.mockResolvedValue({
        document_url: 'http://dm/doc/u',
        document_binary_url: 'http://dm/doc/u/binary',
        document_filename: 'a&b<c>d"e.pdf',
        content_type: 'application/pdf',
        size: 10,
      });

      const req = makeReqWithDocs({
        file: { originalname: 'a&b<c>d"e.pdf', mimetype: 'application/pdf', buffer: Buffer.from(''), size: 10 },
      });
      const res = { json: jest.fn() } as unknown as Response;

      await uploadHandler(req, res);

      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(body.success.messageText).toContain('a&b<c>d"e.pdf');
      expect(body.success.messageHtml).toContain('a&amp;b&lt;c&gt;d&quot;e.pdf');
    });

    it('upload: returns 502 when user not authenticated', async () => {
      const req = makeReqWithDocs({
        session: undefined,
        file: { originalname: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from(''), size: 10 },
      });
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await uploadHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
      expect(mockUploadDocument).not.toHaveBeenCalled();
    });

    it('upload: returns 404 when step has no documentStorage', async () => {
      const { findStep } = require('../../../main/steps/index');
      (findStep as jest.Mock).mockReturnValue({ documentStorage: undefined });

      const req = {
        session: { user: { accessToken: 'token' } },
        params: { caseReference: '123', journey: 'respond-to-claim', step: 'upload-document' },
        t: mockT,
        res: { locals: {} },
        file: { originalname: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from(''), size: 10 },
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await uploadHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('upload: logs non-Error rejections with String()', async () => {
      mockUploadDocument.mockRejectedValue('non-error-reject');

      const req = makeReqWithDocs({
        file: { originalname: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from(''), size: 1024 },
      });
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await uploadHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
    });

    it('delete: unknown docId against empty fresh state returns success (idempotent)', async () => {
      const req = {
        session: { user: { accessToken: 'token' } },
        params: { caseReference: '123', journey: 'respond-to-claim', step: 'upload-document' },
        t: mockT,
        res: { locals: {} },
        body: { delete: 'unknown-id' },
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await deleteHandler(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('concurrency safety (mutex + refetch)', () => {
    let uploadHandler: (req: Request, res: Response) => Promise<void>;
    let deleteHandler: (req: Request, res: Response) => Promise<void>;

    beforeEach(() => {
      const postCalls = (mockApp.post as jest.Mock).mock.calls;
      const uploadCall = postCalls.find((c: unknown[]) => (c[0] as string).includes('/upload'));
      const deleteCall = postCalls.find((c: unknown[]) => (c[0] as string).includes('/delete'));
      uploadHandler = uploadCall[uploadCall.length - 1];
      deleteHandler = deleteCall[deleteCall.length - 1];
    });

    function makeFile(name: string, size: number) {
      return { originalname: name, mimetype: 'application/pdf', buffer: Buffer.from(''), size };
    }

    function makeCdamDoc(uuid: string, name: string, size: number) {
      return {
        document_url: `http://dm/doc/${uuid}`,
        document_binary_url: `http://dm/doc/${uuid}/binary`,
        document_filename: name,
        content_type: 'application/pdf',
        size,
      };
    }

    it('three parallel uploads do not lose entries — refetch sees previous saves', async () => {
      const persisted: unknown[] = [];
      const { findStep } = require('../../../main/steps/index');

      const readFresh = jest.fn().mockImplementation(async () => [...persisted]);
      const save = jest.fn().mockImplementation(async (_req: unknown, docs: unknown[]) => {
        persisted.length = 0;
        persisted.push(...docs);
      });

      (findStep as jest.Mock).mockReturnValue({
        documentStorage: { read: jest.fn().mockResolvedValue([]), readFresh, save },
      });

      mockUploadDocument
        .mockResolvedValueOnce(makeCdamDoc('a', 'a.pdf', 1))
        .mockResolvedValueOnce(makeCdamDoc('b', 'b.pdf', 2))
        .mockResolvedValueOnce(makeCdamDoc('c', 'c.pdf', 3));

      const baseReq = {
        session: { user: { accessToken: 'token' } },
        params: { caseReference: '123456', journey: 'respond-to-claim', step: 'upload-document' },
        t: mockT,
        res: { locals: {} },
      };

      const resA = { json: jest.fn() } as unknown as Response;
      const resB = { json: jest.fn() } as unknown as Response;
      const resC = { json: jest.fn() } as unknown as Response;

      await Promise.all([
        uploadHandler({ ...baseReq, file: makeFile('a.pdf', 1) } as unknown as Request, resA),
        uploadHandler({ ...baseReq, file: makeFile('b.pdf', 2) } as unknown as Request, resB),
        uploadHandler({ ...baseReq, file: makeFile('c.pdf', 3) } as unknown as Request, resC),
      ]);

      expect(persisted).toHaveLength(3);
      const filenames = persisted
        .map(d => (d as { value: { document: { document_filename: string } } }).value.document.document_filename)
        .sort();
      expect(filenames).toEqual(['a.pdf', 'b.pdf', 'c.pdf']);
    });

    it('parallel save + delete are serialized — correct final state', async () => {
      const persisted: unknown[] = [existingDoc];
      const { findStep } = require('../../../main/steps/index');

      const readFresh = jest.fn().mockImplementation(async () => [...persisted]);
      const save = jest.fn().mockImplementation(async (_req: unknown, docs: unknown[]) => {
        persisted.length = 0;
        persisted.push(...docs);
      });

      (findStep as jest.Mock).mockReturnValue({
        documentStorage: { read: jest.fn().mockResolvedValue([existingDoc]), readFresh, save },
      });

      mockDeleteDocument.mockResolvedValue(undefined);
      mockUploadDocument.mockResolvedValue(makeCdamDoc('new', 'new.pdf', 99));

      const baseReq = {
        session: { user: { accessToken: 'token' } },
        params: { caseReference: '123456', journey: 'respond-to-claim', step: 'upload-document' },
        t: mockT,
        res: { locals: {} },
      };

      const uploadRes = { json: jest.fn() } as unknown as Response;
      const deleteRes = { json: jest.fn() } as unknown as Response;

      await Promise.all([
        uploadHandler({ ...baseReq, file: makeFile('new.pdf', 99) } as unknown as Request, uploadRes),
        deleteHandler({ ...baseReq, body: { delete: 'existing-doc-id' } } as unknown as Request, deleteRes),
      ]);

      expect(persisted).toHaveLength(1);
      const remaining = persisted[0] as { value: { document: { document_filename: string } } };
      expect(['existing.pdf', 'new.pdf']).toContain(remaining.value.document.document_filename);
    });

    it('readFresh is called inside the lock — fresh state used, not stale read', async () => {
      const { findStep } = require('../../../main/steps/index');
      const staleDoc = {
        id: 'stale',
        value: { document: { document_url: 'x', document_binary_url: 'x/b', document_filename: 'stale.pdf' } },
      };
      const freshDoc = existingDoc;

      const readFresh = jest.fn().mockResolvedValue([freshDoc]);
      const save = jest.fn().mockResolvedValue(undefined);

      (findStep as jest.Mock).mockReturnValue({
        documentStorage: { read: jest.fn().mockResolvedValue([staleDoc]), readFresh, save },
      });

      mockUploadDocument.mockResolvedValue(makeCdamDoc('new', 'new.pdf', 99));

      const req = {
        session: { user: { accessToken: 'token' } },
        params: { caseReference: '123456', journey: 'respond-to-claim', step: 'upload-document' },
        t: mockT,
        res: { locals: { validatedCase: {} } },
        file: makeFile('new.pdf', 99),
      } as unknown as Request;
      const res = { json: jest.fn() } as unknown as Response;

      await uploadHandler(req, res);

      const body = (res.json as jest.Mock).mock.calls[0][0];
      // readFresh returned [freshDoc], so after append the new doc is at index 1
      expect(body.document.index).toBe(1);
      expect(save).toHaveBeenCalledWith(
        req,
        expect.arrayContaining([freshDoc, expect.objectContaining({ value: expect.any(Object) })])
      );
    });
  });
});
