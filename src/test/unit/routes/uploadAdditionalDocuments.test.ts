import type { Application, Request, Response } from 'express';

import uploadAdditionalDocumentsRoute from '@routes/uploadAdditionalDocuments';

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

describe('uploadAdditionalDocuments route', () => {
  let app: Application;

  beforeEach(() => {
    app = {
      get: jest.fn(),
    } as unknown as Application;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register GET /case/:caseReference/upload-additional-documents with oidc middleware', () => {
    uploadAdditionalDocumentsRoute(app);

    expect(app.get).toHaveBeenCalledWith(
      '/case/:caseReference/upload-additional-documents',
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('should render the upload-additional-documents template', () => {
    uploadAdditionalDocumentsRoute(app);

    const handler = (app.get as jest.Mock).mock.calls[0][2] as (req: Request, res: Response) => void;
    const res = { render: jest.fn() } as unknown as Response;

    handler({} as Request, res);

    expect(res.render).toHaveBeenCalledWith('upload-additional-documents');
  });
});
