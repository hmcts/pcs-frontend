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

jest.mock('../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
    updateDraftRespondToClaim: jest.fn().mockResolvedValue({ id: '123', data: {} }),
  },
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

function makeReqWithDocs(overrides: Record<string, unknown>, docs: unknown[] = []) {
  // Mirror the docs into the getCaseById refetch so save/remove see the same state.
  // Tests that want to simulate a stale snapshot can override the mock after this.
  const { ccdCaseService } = require('../../../main/services/ccdCaseService');
  (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
    id: '123456',
    data: {
      possessionClaimResponse: {
        defendantResponses: {
          defendantDocuments: docs,
        },
      },
    },
  });
  return {
    session: { user: { accessToken: 'token' } },
    params: { caseReference: '123456' },
    t: mockT,
    res: {
      locals: {
        validatedCase: {
          possessionClaimResponse: {
            defendantResponses: {
              defendantDocuments: docs,
            },
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

function freshCaseWith(docs: unknown[]) {
  return {
    id: '123456',
    data: {
      possessionClaimResponse: {
        defendantResponses: {
          defendantDocuments: docs,
        },
      },
    },
  };
}

describe('documentProxyRoutes', () => {
  let mockApp: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    const { ccdCaseService } = require('../../../main/services/ccdCaseService');
    (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue(freshCaseWith([]));
    (ccdCaseService.updateDraftRespondToClaim as jest.Mock).mockResolvedValue({ id: '123', data: {} });
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
      const req = makeReqWithDocs({ params: { caseReference: '123456', index: 'abc' } });
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when index out of range', async () => {
      const req = makeReqWithDocs({ params: { caseReference: '123456', index: '5' } }, [existingDoc]);
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('streams document with security headers using server-side CDAM URL', async () => {
      const { getDocumentBinary } = require('@services/cdamService');
      const mockStream = { pipe: jest.fn(), on: jest.fn() };
      (getDocumentBinary as jest.Mock).mockResolvedValue({ stream: mockStream, contentType: 'application/pdf' });

      const req = makeReqWithDocs({ params: { caseReference: '123456', index: '0' } }, [existingDoc]);
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

      const req = makeReqWithDocs({ params: { caseReference: '123456', index: '0' } }, [existingDoc]);
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

      // Should return index and filename, NOT CDAM URLs
      expect(body.document.index).toBe(0);
      expect(body.document.document_filename).toBe('test.pdf');
      expect(body.document.document_url).toBeUndefined();
      expect(body.document.document_binary_url).toBeUndefined();
    });

    it('appends to existing documents and saves draft', async () => {
      const mockDoc = {
        document_url: 'http://dm/doc/new-uuid',
        document_binary_url: 'http://dm/doc/new-uuid/binary',
        document_filename: 'new.pdf',
        content_type: 'application/pdf',
        size: 2048,
      };
      mockUploadDocument.mockResolvedValue(mockDoc);

      const req = makeReqWithDocs(
        { file: { originalname: 'new.pdf', mimetype: 'application/pdf', buffer: Buffer.from(''), size: 2048 } },
        [existingDoc]
      );
      const res = { json: jest.fn() } as unknown as Response;

      await handler(req, res);

      const { ccdCaseService } = require('../../../main/services/ccdCaseService');
      expect(ccdCaseService.updateDraftRespondToClaim).toHaveBeenCalledWith('token', '123456', {
        possessionClaimResponse: {
          defendantResponses: {
            defendantDocuments: expect.arrayContaining([
              existingDoc,
              expect.objectContaining({ value: expect.any(Object) }),
            ]),
          },
        },
      });

      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(body.document.index).toBe(1);
    });

    it('assigns a generated UUID id to the new collection item (so CCD treats it as stable across round-trips)', async () => {
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
      const res = { json: jest.fn() } as unknown as Response;

      await handler(req, res);

      const { ccdCaseService } = require('../../../main/services/ccdCaseService');
      const savedDocs = (ccdCaseService.updateDraftRespondToClaim as jest.Mock).mock.calls[0][2].possessionClaimResponse
        .defendantResponses.defendantDocuments;
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

    it('returns success (idempotent) when docId is not found in fresh CCD state', async () => {
      const req = makeReqWithDocs({ body: { delete: 'unknown-id' } }, [existingDoc]);
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(mockDeleteDocument).not.toHaveBeenCalled();
    });

    it('deletes by docId using server-side CDAM URL and saves draft', async () => {
      mockDeleteDocument.mockResolvedValue(undefined);

      const req = makeReqWithDocs({ body: { delete: 'existing-doc-id' } }, [existingDoc]);
      const res = { json: jest.fn() } as unknown as Response;

      await handler(req, res);

      // Should use the CDAM URL from CCD data, not from browser
      expect(mockDeleteDocument).toHaveBeenCalledWith('http://dm/doc/existing-uuid', 'token');
      expect(res.json).toHaveBeenCalledWith({ success: true });

      const { ccdCaseService } = require('../../../main/services/ccdCaseService');
      expect(ccdCaseService.updateDraftRespondToClaim).toHaveBeenCalledWith('token', '123456', {
        possessionClaimResponse: {
          defendantResponses: {
            defendantDocuments: [],
          },
        },
      });
    });

    it('returns 502 when delete fails', async () => {
      mockDeleteDocument.mockRejectedValue(new Error('CDAM down'));

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

    it('upload: handles missing validatedCase (empty existing docs)', async () => {
      mockUploadDocument.mockResolvedValue({
        document_url: 'http://dm/doc/u',
        document_binary_url: 'http://dm/doc/u/binary',
        document_filename: 'test.pdf',
        content_type: 'application/pdf',
        size: 10,
      });

      const req = {
        session: { user: { accessToken: 'token' } },
        params: { caseReference: '123' },
        t: mockT,
        res: { locals: {} },
        file: { originalname: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from(''), size: 10 },
      } as unknown as Request;
      const res = { json: jest.fn() } as unknown as Response;

      await uploadHandler(req, res);

      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(body.document.index).toBe(0);
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

    it('delete: unknown docId against empty fresh CCD state returns success (idempotent)', async () => {
      const req = {
        session: { user: { accessToken: 'token' } },
        params: { caseReference: '123' },
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
      const { ccdCaseService } = require('../../../main/services/ccdCaseService');
      const persisted: unknown[] = [];

      // Each getCaseById call returns the current persisted snapshot — simulating the
      // START callback after each save. Without the lock, all three would read the
      // same starting state and only one entry would survive.
      (ccdCaseService.getCaseById as jest.Mock).mockImplementation(async () => ({
        id: '123456',
        data: {
          possessionClaimResponse: {
            defendantResponses: { defendantDocuments: [...persisted] },
          },
        },
      }));
      (ccdCaseService.updateDraftRespondToClaim as jest.Mock).mockImplementation(async (_t, _c, payload) => {
        const docs = payload.possessionClaimResponse.defendantResponses.defendantDocuments;
        persisted.length = 0;
        persisted.push(...docs);
        return { id: '123', data: {} };
      });

      mockUploadDocument
        .mockResolvedValueOnce(makeCdamDoc('a', 'a.pdf', 1))
        .mockResolvedValueOnce(makeCdamDoc('b', 'b.pdf', 2))
        .mockResolvedValueOnce(makeCdamDoc('c', 'c.pdf', 3));

      const reqA = makeReqWithDocs({ file: makeFile('a.pdf', 1) });
      const reqB = makeReqWithDocs({ file: makeFile('b.pdf', 2) });
      const reqC = makeReqWithDocs({ file: makeFile('c.pdf', 3) });
      // Re-arm the mocks once after the makeReqWithDocs() helpers (which last-write-win
      // each set getCaseById back to []), so the dynamic implementation above is in effect.
      (ccdCaseService.getCaseById as jest.Mock).mockImplementation(async () => ({
        id: '123456',
        data: {
          possessionClaimResponse: {
            defendantResponses: { defendantDocuments: [...persisted] },
          },
        },
      }));

      const resA = { json: jest.fn() } as unknown as Response;
      const resB = { json: jest.fn() } as unknown as Response;
      const resC = { json: jest.fn() } as unknown as Response;

      await Promise.all([uploadHandler(reqA, resA), uploadHandler(reqB, resB), uploadHandler(reqC, resC)]);

      expect(persisted).toHaveLength(3);
      const filenames = persisted
        .map(d => (d as { value: { document: { document_filename: string } } }).value.document.document_filename)
        .sort();
      expect(filenames).toEqual(['a.pdf', 'b.pdf', 'c.pdf']);
    });

    it('parallel save + delete are serialized — delete sees the just-uploaded file', async () => {
      const { ccdCaseService } = require('../../../main/services/ccdCaseService');
      const persisted: unknown[] = [existingDoc];

      (ccdCaseService.getCaseById as jest.Mock).mockImplementation(async () => ({
        id: '123456',
        data: {
          possessionClaimResponse: {
            defendantResponses: { defendantDocuments: [...persisted] },
          },
        },
      }));
      (ccdCaseService.updateDraftRespondToClaim as jest.Mock).mockImplementation(async (_t, _c, payload) => {
        const docs = payload.possessionClaimResponse.defendantResponses.defendantDocuments;
        persisted.length = 0;
        persisted.push(...docs);
        return { id: '123', data: {} };
      });
      mockDeleteDocument.mockResolvedValue(undefined);
      mockUploadDocument.mockResolvedValue(makeCdamDoc('new', 'new.pdf', 99));

      const uploadReq = {
        session: { user: { accessToken: 'token' } },
        params: { caseReference: '123456' },
        t: mockT,
        res: { locals: {} },
        file: makeFile('new.pdf', 99),
      } as unknown as Request;
      const deleteReq = {
        session: { user: { accessToken: 'token' } },
        params: { caseReference: '123456' },
        t: mockT,
        res: { locals: {} },
        body: { delete: 'existing-doc-id' },
      } as unknown as Request;

      const uploadRes = { json: jest.fn() } as unknown as Response;
      const deleteRes = { json: jest.fn() } as unknown as Response;

      await Promise.all([uploadHandler(uploadReq, uploadRes), deleteHandler(deleteReq, deleteRes)]);

      expect(persisted).toHaveLength(1);
      const remaining = persisted[0] as { value: { document: { document_filename: string } } };
      expect(['existing.pdf', 'new.pdf']).toContain(remaining.value.document.document_filename);
    });

    it('refetches inside the lock — uses fresh CCD state, not stale res.locals.validatedCase', async () => {
      const { ccdCaseService } = require('../../../main/services/ccdCaseService');
      // res.locals.validatedCase shows empty, but the fresh fetch has one doc — confirm
      // the save is built on the fresh fetch (length 2 after append), not on the stale snapshot.
      (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
        id: '123456',
        data: {
          possessionClaimResponse: {
            defendantResponses: { defendantDocuments: [existingDoc] },
          },
        },
      });
      mockUploadDocument.mockResolvedValue(makeCdamDoc('new', 'new.pdf', 99));

      const req = {
        session: { user: { accessToken: 'token' } },
        params: { caseReference: '123456' },
        t: mockT,
        res: {
          locals: { validatedCase: { possessionClaimResponse: { defendantResponses: { defendantDocuments: [] } } } },
        },
        file: makeFile('new.pdf', 99),
      } as unknown as Request;
      const res = { json: jest.fn() } as unknown as Response;

      await uploadHandler(req, res);

      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(body.document.index).toBe(1); // 0 = existingDoc, 1 = the new one
      expect(ccdCaseService.updateDraftRespondToClaim).toHaveBeenCalledWith(
        'token',
        '123456',
        expect.objectContaining({
          possessionClaimResponse: expect.objectContaining({
            defendantResponses: expect.objectContaining({
              defendantDocuments: expect.arrayContaining([
                existingDoc,
                expect.objectContaining({ value: expect.any(Object) }),
              ]),
            }),
          }),
        })
      );
    });
  });
});
