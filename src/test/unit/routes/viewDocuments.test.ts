import { PassThrough } from 'stream';

import type { Application, Request, Response } from 'express';

import viewDocumentsRoute from '@routes/viewDocuments';
import { ccdCaseService } from '@services/ccdCaseService';
import { getDocumentBinary } from '@services/cdamService';

type RouteHandler = (req: Request, res: Response, next: jest.Mock) => Promise<void>;

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('@services/cdamService', () => ({
  getDocumentBinary: jest.fn(),
}));

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
  },
}));

const mockGetCaseById = ccdCaseService.getCaseById as jest.Mock;

describe('viewDocuments route', () => {
  let app: Application;

  const getHandler = (path: string): RouteHandler => {
    const call = (app.get as jest.Mock).mock.calls.find(([routePath]) => routePath === path);
    if (!call) {
      throw new Error(`No handler registered for ${path}`);
    }
    return call[2] as RouteHandler;
  };

  beforeEach(() => {
    app = {
      get: jest.fn(),
    } as unknown as Application;
    viewDocumentsRoute(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Route registration', () => {
    it('registers GET /case/:caseReference/view-documents with oidc middleware', () => {
      expect(app.get).toHaveBeenCalledWith(
        '/case/:caseReference/view-documents',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('registers GET /case/:caseReference/view-documents/:documentId with oidc middleware', () => {
      expect(app.get).toHaveBeenCalledWith(
        '/case/:caseReference/view-documents/:documentId',
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('GET /case/:caseReference/view-documents', () => {
    it('fetches the case via getCaseById and renders the view-documents template', async () => {
      mockGetCaseById.mockResolvedValue({
        id: '1777570813792018',
        data: {
          allDocuments: [
            {
              id: '181c89a0-ae0a-4b6b-aff4-36bd8b8122aa',
              value: {
                document_filename: 'claim-form.pdf',
                document_binary_url: 'http://doc-store/claim-form/binary',
                upload_timestamp: '2026-06-24',
                category_id: 'statementsOfCase',
              },
            },
          ],
        },
      });

      const handler = getHandler('/case/:caseReference/view-documents');
      const res = { render: jest.fn() } as unknown as Response;

      await handler(
        {
          params: { caseReference: '1777570813792018' },
          language: 'en',
          session: { user: { accessToken: 'token' } },
          t: (key: string) =>
            (
              ({
                'dashboard:viewDocuments.submittedOn': 'Submitted on',
                'dashboard:viewDocuments.folders.statementsOfCase': 'Statements of case',
                'dashboard:viewDocuments.folders.propertyDocuments': 'Property documents',
                'dashboard:viewDocuments.folders.evidence': 'Evidence',
                'dashboard:viewDocuments.folders.correspondence': 'Correspondence',
              }) as Record<string, string>
            )[key],
        } as unknown as Request,
        res,
        jest.fn()
      );

      expect(mockGetCaseById).toHaveBeenCalledWith('token', '1777570813792018');
      expect(res.render).toHaveBeenCalledWith(
        'view-documents',
        expect.objectContaining({
          caseReference: '1777570813792018',
          documentFolders: [
            expect.objectContaining({
              title: 'Statements of case',
              documents: [
                expect.objectContaining({
                  id: '181c89a0-ae0a-4b6b-aff4-36bd8b8122aa',
                  filename: 'claim-form.pdf',
                  submittedOn: '2026-06-24',
                }),
              ],
            }),
          ],
        })
      );
    });

    it('returns 401 when access token is missing', async () => {
      const handler = getHandler('/case/:caseReference/view-documents');
      const next = jest.fn();

      await handler(
        {
          params: { caseReference: '1777570813792018' },
          session: {},
        } as unknown as Request,
        { render: jest.fn() } as unknown as Response,
        next
      );

      expect(mockGetCaseById).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Authentication required', status: 401 }));
    });

    it('forwards errors from getCaseById to the next middleware (e.g. 404)', async () => {
      const httpError = new (require('../../../main/HttpError').HTTPError)('Case not found', 404);
      mockGetCaseById.mockRejectedValue(httpError);

      const handler = getHandler('/case/:caseReference/view-documents');
      const next = jest.fn();

      await handler(
        {
          params: { caseReference: '1777570813792018' },
          session: { user: { accessToken: 'token' } },
          t: (key: string) => key,
        } as unknown as Request,
        { render: jest.fn() } as unknown as Response,
        next
      );

      expect(next).toHaveBeenCalledWith(httpError);
    });
  });

  describe('GET /case/:caseReference/view-documents/:documentId', () => {
    const validCaseData = {
      id: '1777570813792018',
      data: {
        allDocuments: [
          {
            id: '181c89a0-ae0a-4b6b-aff4-36bd8b8122aa',
            value: {
              document_filename: 'claim-form.pdf',
              document_binary_url: 'http://dm-store/documents/abc-123/binary',
            },
          },
        ],
      },
    };

    it('streams document binary for a valid document id', async () => {
      const stream = new PassThrough();
      const pipeSpy = jest.spyOn(stream, 'pipe').mockReturnValue({} as unknown as PassThrough);
      (getDocumentBinary as jest.Mock).mockResolvedValue({
        stream,
        contentType: 'application/pdf',
        contentLength: '1234',
      });
      mockGetCaseById.mockResolvedValue(validCaseData);

      const handler = getHandler('/case/:caseReference/view-documents/:documentId');
      const res = {
        setHeader: jest.fn(),
      } as unknown as Response;
      const next = jest.fn();

      await handler(
        {
          params: {
            caseReference: '1777570813792018',
            documentId: '181c89a0-ae0a-4b6b-aff4-36bd8b8122aa',
          },
          session: { user: { accessToken: 'token' } },
        } as unknown as Request,
        res,
        next
      );

      expect(mockGetCaseById).toHaveBeenCalledWith('token', '1777570813792018');
      expect(getDocumentBinary).toHaveBeenCalledWith('http://dm-store/documents/abc-123/binary', 'token');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Length', '1234');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'inline; filename="claim-form.pdf"; filename*=UTF-8\'\'claim-form.pdf'
      );
      expect(pipeSpy).toHaveBeenCalledWith(res);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when access token is missing', async () => {
      const handler = getHandler('/case/:caseReference/view-documents/:documentId');
      const next = jest.fn();

      await handler(
        {
          params: {
            caseReference: '1777570813792018',
            documentId: '181c89a0-ae0a-4b6b-aff4-36bd8b8122aa',
          },
          session: {},
        } as unknown as Request,
        { setHeader: jest.fn() } as unknown as Response,
        next
      );

      expect(mockGetCaseById).not.toHaveBeenCalled();
      expect(getDocumentBinary).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Authentication required', status: 401 }));
    });

    it('returns 404 when documentId is not a valid UUID', async () => {
      const handler = getHandler('/case/:caseReference/view-documents/:documentId');
      const next = jest.fn();

      await handler(
        {
          params: {
            caseReference: '1777570813792018',
            documentId: 'not-a-uuid',
          },
          session: { user: { accessToken: 'token' } },
        } as unknown as Request,
        { setHeader: jest.fn() } as unknown as Response,
        next
      );

      expect(mockGetCaseById).not.toHaveBeenCalled();
      expect(getDocumentBinary).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Document not found', status: 404 }));
    });

    it('returns 404 when document binary URL is missing', async () => {
      mockGetCaseById.mockResolvedValue({
        id: '1777570813792018',
        data: {
          allDocuments: [
            {
              id: '181c89a0-ae0a-4b6b-aff4-36bd8b8122aa',
              value: { document_filename: 'claim-form.pdf', document_binary_url: '   ' },
            },
          ],
        },
      });

      const handler = getHandler('/case/:caseReference/view-documents/:documentId');
      const next = jest.fn();

      await handler(
        {
          params: {
            caseReference: '1777570813792018',
            documentId: '181c89a0-ae0a-4b6b-aff4-36bd8b8122aa',
          },
          session: { user: { accessToken: 'token' } },
        } as unknown as Request,
        { setHeader: jest.fn() } as unknown as Response,
        next
      );

      expect(getDocumentBinary).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Document not found', status: 404 }));
    });

    it('forwards errors from getCaseById to next', async () => {
      const httpError = new (require('../../../main/HttpError').HTTPError)('Case not found', 404);
      mockGetCaseById.mockRejectedValue(httpError);

      const handler = getHandler('/case/:caseReference/view-documents/:documentId');
      const next = jest.fn();

      await handler(
        {
          params: {
            caseReference: '1777570813792018',
            documentId: '181c89a0-ae0a-4b6b-aff4-36bd8b8122aa',
          },
          session: { user: { accessToken: 'token' } },
        } as unknown as Request,
        { setHeader: jest.fn() } as unknown as Response,
        next
      );

      expect(next).toHaveBeenCalledWith(httpError);
    });

    it('calls next with 502 when stream emits error before headers sent', async () => {
      const stream = new PassThrough();
      (getDocumentBinary as jest.Mock).mockResolvedValue({
        stream,
        contentType: 'application/pdf',
      });
      mockGetCaseById.mockResolvedValue(validCaseData);

      const handler = getHandler('/case/:caseReference/view-documents/:documentId');
      const next = jest.fn();
      const res = {
        headersSent: false,
        setHeader: jest.fn(),
      } as unknown as Response;

      await handler(
        {
          params: {
            caseReference: '1777570813792018',
            documentId: '181c89a0-ae0a-4b6b-aff4-36bd8b8122aa',
          },
          session: { user: { accessToken: 'token' } },
        } as unknown as Request,
        res,
        next
      );

      stream.emit('error', new Error('stream failed'));
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Failed to stream document', status: 502 }));
    });
  });
});
