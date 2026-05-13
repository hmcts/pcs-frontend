import { PassThrough } from 'stream';

import type { Application, Request, Response } from 'express';

import viewDocumentsRoute from '@routes/viewDocuments';
import { getDocumentBinary } from '@services/cdamService';

type RouteHandler = (req: Request, res: Response, next: jest.Mock) => Promise<void>;

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('@services/cdamService', () => ({
  getDocumentBinary: jest.fn(),
}));

describe('viewDocuments route', () => {
  let app: Application;

  beforeEach(() => {
    app = {
      get: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register GET /case/:caseReference/view-documents with oidc middleware', () => {
    viewDocumentsRoute(app);

    expect(app.get).toHaveBeenCalledWith('/case/:caseReference/view-documents', expect.anything(), expect.anything());
    expect(app.get).toHaveBeenCalledWith(
      '/case/:caseReference/view-documents/:documentId',
      expect.anything(),
      expect.anything()
    );
  });

  it('should render the view-documents template with extracted folders', async () => {
    viewDocumentsRoute(app);

    const handler = (app.get as jest.Mock).mock.calls.find(
      call => call[0] === '/case/:caseReference/view-documents'
    )?.[2] as RouteHandler;
    const res = {
      locals: {
        validatedCase: {
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
        },
      },
      render: jest.fn(),
    } as unknown as Response;

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

  it('should stream document binary for document page', async () => {
    viewDocumentsRoute(app);

    const stream = new PassThrough();
    const pipeSpy = jest.spyOn(stream, 'pipe').mockReturnValue({} as unknown as PassThrough);
    (getDocumentBinary as jest.Mock).mockResolvedValue({
      stream,
      contentType: 'application/pdf',
      contentLength: '1234',
    });

    const handler = (app.get as jest.Mock).mock.calls.find(
      call => call[0] === '/case/:caseReference/view-documents/:documentId'
    )?.[2] as RouteHandler;
    const res = {
      locals: {
        validatedCase: {
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
        },
      },
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

    expect(getDocumentBinary).toHaveBeenCalledWith('http://dm-store/documents/abc-123/binary', 'token');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', '1234');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      "inline; filename=\"claim-form.pdf\"; filename*=UTF-8''claim-form.pdf"
    );
    expect(pipeSpy).toHaveBeenCalledWith(res);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 404 when documentId is not a valid UUID', async () => {
    viewDocumentsRoute(app);

    const handler = (app.get as jest.Mock).mock.calls.find(
      call => call[0] === '/case/:caseReference/view-documents/:documentId'
    )?.[2] as RouteHandler;
    const res = {
      locals: {
        validatedCase: {
          id: '1777570813792018',
          data: {},
        },
      },
      setHeader: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    await handler(
      {
        params: {
          caseReference: '1777570813792018',
          documentId: 'not-a-uuid',
        },
        session: { user: { accessToken: 'token' } },
      } as unknown as Request,
      res,
      next
    );

    expect(getDocumentBinary).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Document not found', status: 404 }));
  });
});
