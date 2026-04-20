jest.mock('../../../main/modules/logger', () => {
  const loggerInstance = { error: jest.fn(), info: jest.fn(), warn: jest.fn() };
  return { Logger: { getLogger: jest.fn(() => loggerInstance) } };
});

jest.mock('../../../main/services/cdamService', () => ({
  uploadDocument: jest.fn(),
  deleteDocument: jest.fn(),
}));

jest.mock('../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    updateDraftRespondToClaim: jest.fn().mockResolvedValue({ id: '123', data: {} }),
  },
}));

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

import type { Application, Request, Response } from 'express';

import documentUploadRoutes from '../../../main/routes/documentUpload';

import { deleteDocument, uploadDocument } from '@services/cdamService';

const mockUploadDocument = uploadDocument as jest.Mock;
const mockDeleteDocument = deleteDocument as jest.Mock;

const mockT = (key: string) => key;

function makeReqWithDocs(overrides: Record<string, unknown>, docs: unknown[] = []) {
  return {
    session: { user: { accessToken: 'token' } },
    params: { caseReference: '123456' },
    t: mockT,
    res: {
      locals: {
        validatedCase: {
          possessionClaimResponse: {
            defendantResponses: {
              uploadedDocuments: docs,
            },
          },
        },
      },
    },
    ...overrides,
  } as unknown as Request;
}

const existingDoc = {
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

describe('documentUploadRoutes', () => {
  let mockApp: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApp = {
      post: jest.fn(),
    } as unknown as Application;

    documentUploadRoutes(mockApp);
  });

  it('registers journey-agnostic upload and delete routes', () => {
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
            uploadedDocuments: expect.arrayContaining([
              existingDoc,
              expect.objectContaining({ value: expect.any(Object) }),
            ]),
          },
        },
      });

      const body = (res.json as jest.Mock).mock.calls[0][0];
      expect(body.document.index).toBe(1);
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

    it('returns 400 when no index provided', async () => {
      const req = makeReqWithDocs({ body: {} });
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when index out of range', async () => {
      const req = makeReqWithDocs({ body: { delete: '5' } }, [existingDoc]);
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes by index using server-side CDAM URL and saves draft', async () => {
      mockDeleteDocument.mockResolvedValue(undefined);

      const req = makeReqWithDocs({ body: { delete: '0' } }, [existingDoc]);
      const res = { json: jest.fn() } as unknown as Response;

      await handler(req, res);

      // Should use the CDAM URL from CCD data, not from browser
      expect(mockDeleteDocument).toHaveBeenCalledWith('http://dm/doc/existing-uuid', 'token');
      expect(res.json).toHaveBeenCalledWith({ success: true });

      const { ccdCaseService } = require('../../../main/services/ccdCaseService');
      expect(ccdCaseService.updateDraftRespondToClaim).toHaveBeenCalledWith('token', '123456', {
        possessionClaimResponse: {
          defendantResponses: {
            uploadedDocuments: [],
          },
        },
      });
    });

    it('returns 502 when delete fails', async () => {
      mockDeleteDocument.mockRejectedValue(new Error('CDAM down'));

      const req = makeReqWithDocs({ body: { delete: '0' } }, [existingDoc]);
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
    });
  });
});
