jest.mock('../../../main/modules/logger', () => {
  const loggerInstance = { error: jest.fn(), info: jest.fn(), warn: jest.fn() };
  return { Logger: { getLogger: jest.fn(() => loggerInstance) } };
});

jest.mock('../../../main/services/cdamService', () => ({
  uploadDocument: jest.fn(),
  deleteDocument: jest.fn(),
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
      const req = { file: undefined, session: { user: { accessToken: 'token' } }, t: mockT } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns document on successful upload', async () => {
      const mockDoc = {
        document_url: 'http://dm/doc/123',
        document_binary_url: 'http://dm/doc/123/binary',
        document_filename: 'test.pdf',
        content_type: 'application/pdf',
        size: 1024,
      };
      mockUploadDocument.mockResolvedValue(mockDoc);

      const req = {
        file: { originalname: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from(''), size: 1024 },
        session: { user: { accessToken: 'token' } },
        t: mockT,
      } as unknown as Request;
      const res = { json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(mockUploadDocument).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: expect.objectContaining({ messageText: expect.any(String) }),
          document: mockDoc,
        })
      );
    });

    it('returns 502 when cdamService throws', async () => {
      mockUploadDocument.mockRejectedValue(new Error('CDAM down'));

      const req = {
        file: { originalname: 'test.pdf', mimetype: 'application/pdf', buffer: Buffer.from(''), size: 1024 },
        session: { user: { accessToken: 'token' } },
        t: mockT,
      } as unknown as Request;
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

    it('returns error when no document URL provided', async () => {
      const req = { body: {}, session: { user: { accessToken: 'token' } }, t: mockT } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns success on successful delete', async () => {
      mockDeleteDocument.mockResolvedValue(undefined);

      const req = {
        body: { delete: 'http://dm/doc/123' },
        session: { user: { accessToken: 'token' } },
        t: mockT,
      } as unknown as Request;
      const res = { json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(mockDeleteDocument).toHaveBeenCalledWith('http://dm/doc/123', 'token');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 502 when delete fails', async () => {
      mockDeleteDocument.mockRejectedValue(new Error('CDAM down'));

      const req = {
        body: { delete: 'http://dm/doc/123' },
        session: { user: { accessToken: 'token' } },
        t: mockT,
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
    });
  });
});
