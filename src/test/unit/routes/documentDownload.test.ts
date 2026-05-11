import type { Application, NextFunction, Request, RequestHandler, Response } from 'express';

import { oidcMiddleware } from '../../../main/middleware';

import downloadDocumentRoutes from '@routes/documentDownload';
import { documentClient } from '@services/documentClient';

jest.mock('@services/documentClient', () => ({
  documentClient: {
    retrieveDocument: jest.fn(),
  },
}));

describe('Document download Application Route', () => {
  let app: Application;

  beforeEach(() => {
    app = {
      get: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register handler with path and OIDC middleware', () => {
    downloadDocumentRoutes(app);

    expect((app.get as jest.Mock).mock.calls[0][0]).toBe('/documents/:documentId/download');
    expect((app.get as jest.Mock).mock.calls[0][1]).toBe(oidcMiddleware);
  });

  it('should download doc with inline content disposition', async () => {
    const testContentBuffer = Buffer.from('test content');

    (documentClient.retrieveDocument as jest.Mock).mockResolvedValue({
      contentType: 'some content type',
      fileName: 'test-file.pdf',
      data: testContentBuffer,
    });

    downloadDocumentRoutes(app);

    const handler = getConfiguredRequestHandler(app);

    const documentId = 'bf112cdf-76d7-4d15-bb92-cd7c3483a7ef';
    const req = {
      params: { documentId },
      session: { user: { accessToken: 'access-token-1' } },
    } as unknown as Request;

    const res = {
      writeHead: jest.fn(),
      end: jest.fn(),
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    await handler(req, res, next);

    expect(documentClient.retrieveDocument).toHaveBeenCalledWith(documentId, 'access-token-1');
    expect(next).not.toHaveBeenCalled();

    expect(res.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        'Content-Disposition': 'inline; filename="test-file.pdf"',
        'Content-Length': 12,
        'Content-Type': 'some content type',
      })
    );

    expect(res.end).toHaveBeenCalledWith(testContentBuffer);
  });

  it('should throw error when no access token in session', async () => {
    downloadDocumentRoutes(app);

    const handler = getConfiguredRequestHandler(app);

    const documentId = 'bf112cdf-76d7-4d15-bb92-cd7c3483a7ef';
    const req = {
      params: { documentId },
      session: {
        user: { accessToken: null },
      },
    } as unknown as Request;

    const res = {
      render: jest.fn(),
    } as unknown as Response;

    const next: NextFunction = jest.fn();

    await expect(handler(req, res, next)).rejects.toThrow('Authentication required');
  });
});

function getConfiguredRequestHandler(app: Application) {
  return (app.get as jest.Mock).mock.calls[0][2] as RequestHandler;
}
