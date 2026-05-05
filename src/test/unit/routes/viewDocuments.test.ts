import type { Application, Request, Response } from 'express';

import viewDocumentsRoute from '@routes/viewDocuments';
import { ccdCaseService } from '@services/ccdCaseService';

type RouteHandler = (req: Request, res: Response, next: jest.Mock) => Promise<void>;

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
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
  });

  it('should render the view-documents template with extracted folders', async () => {
    viewDocumentsRoute(app);

    (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
      id: '1777570813792018',
      data: {
        statementsOfCase: [
          {
            id: '181c89a0-ae0a-4b6b-aff4-36bd8b8122aa',
            document_filename: 'claim-form.pdf',
            document_binary_url: 'http://doc-store/claim-form/binary',
            upload_timestamp: '2026-06-24',
          },
        ],
      },
    });

    const handler = (app.get as jest.Mock).mock.calls[0][2] as RouteHandler;
    const res = {
      render: jest.fn(),
    } as unknown as Response;

    await handler(
      {
        params: { caseId: '1777570813792018' },
        language: 'en',
        session: { user: { accessToken: 'token' } },
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
                href: 'http://doc-store/claim-form/binary',
                submittedOn: 'Submitted on 24 June 2026',
              }),
            ],
          }),
        ],
      })
    );
  });
});
