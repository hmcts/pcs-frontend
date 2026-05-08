import type { Application, Request, Response } from 'express';
import { PassThrough } from 'stream';

import viewDocumentsRoute from '@routes/viewDocuments';
import { ccdCaseService } from '@services/ccdCaseService';
import { documentService } from '@services/documentService';

type RouteHandler = (req: Request, res: Response, next: jest.Mock) => Promise<void>;

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
  },
}));

jest.mock('@services/documentService', () => ({
  documentService: {
    getDocumentStream: jest.fn(),
  },
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

  it('should register GET /case/:caseId/view-documents with oidc middleware', () => {
    viewDocumentsRoute(app);

    expect(app.get).toHaveBeenCalledWith('/case/:caseId/view-documents', expect.anything(), expect.anything());
    expect(app.get).toHaveBeenCalledWith(
      '/case/:caseId/view-documents/:documentId',
      expect.anything(),
      expect.anything()
    );
  });

  it('should render the view-documents template with extracted folders', async () => {
    viewDocumentsRoute(app);

    (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
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

    const handler = (app.get as jest.Mock).mock.calls.find(
      call => call[0] === '/case/:caseId/view-documents'
    )?.[2] as RouteHandler;
    const res = {
      render: jest.fn(),
    } as unknown as Response;

    await handler(
      {
        params: { caseId: '1777570813792018' },
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
                submittedOn: 'Submitted on 24 June 2026',
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
    (documentService.getDocumentStream as jest.Mock).mockResolvedValue({
      stream,
      contentType: 'application/pdf',
      contentLength: '1234',
      filename: 'claim-form.pdf',
    });

    const handler = (app.get as jest.Mock).mock.calls.find(
      call => call[0] === '/case/:caseId/view-documents/:documentId'
    )?.[2] as RouteHandler;
    const res = {
      setHeader: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    await handler(
      {
        params: {
          caseId: '1777570813792018',
          documentId: '181c89a0-ae0a-4b6b-aff4-36bd8b8122aa',
        },
        session: { user: { accessToken: 'token' } },
      } as unknown as Request,
      res,
      next
    );

    expect(documentService.getDocumentStream).toHaveBeenCalledWith(
      'token',
      '1777570813792018',
      '181c89a0-ae0a-4b6b-aff4-36bd8b8122aa'
    );
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', '1234');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="claim-form.pdf"');
    expect(pipeSpy).toHaveBeenCalledWith(res);
    expect(next).not.toHaveBeenCalled();
  });
});
