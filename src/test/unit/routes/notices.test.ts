import type { Application, Request, Response } from 'express';

import noticesRoute from '@routes/notices';
import { ccdCaseService } from '@services/ccdCaseService';

type RouteHandler = (req: Request, res: Response, next: jest.Mock) => Promise<void>;

jest.mock('../../../main/middleware', () => ({
  oidcMiddleware: jest.fn((req, res, next) => next()),
}));

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
  },
}));

const mockGetCaseById = ccdCaseService.getCaseById as jest.Mock;

const noticeOfEviction = {
  id: '9d4eb1a1-4e6a-4f25-9f14-1dd1dbd0a4f1',
  value: {
    document_filename: 'notice-of-eviction.pdf',
    document_binary_url: 'http://doc-store/notice-of-eviction/binary',
    upload_timestamp: '2026-07-01',
    category_id: 'enforcement',
  },
};

const translate = (key: string) =>
  (({ 'dashboard:viewOrdersAndNotices.folders.enforcement': 'Enforcement' }) as Record<string, string>)[key] ?? key;

const buildRequest = () =>
  ({
    params: { caseReference: '1777570813792018' },
    language: 'en',
    session: { user: { accessToken: 'token' } },
    t: translate,
  }) as unknown as Request;

describe('notices route', () => {
  let app: Application;

  const getHandler = (): RouteHandler => {
    const call = (app.get as jest.Mock).mock.calls.find(
      ([routePath]) => routePath === '/case/:caseReference/view-orders-and-notices'
    );
    if (!call) {
      throw new Error('No handler registered for the view orders and notices route');
    }
    return call[2] as RouteHandler;
  };

  beforeEach(() => {
    app = {
      get: jest.fn(),
    } as unknown as Application;
    noticesRoute(app);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register GET /case/:caseReference/view-orders-and-notices with oidc middleware', () => {
    expect(app.get).toHaveBeenCalledWith(
      '/case/:caseReference/view-orders-and-notices',
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('renders a served notice of eviction in the Enforcement folder', async () => {
    mockGetCaseById.mockResolvedValue({ id: '1777570813792018', data: { allDocuments: [noticeOfEviction] } });

    const res = { render: jest.fn() } as unknown as Response;
    await getHandler()(buildRequest(), res, jest.fn());

    expect(mockGetCaseById).toHaveBeenCalledWith('token', '1777570813792018');
    expect(res.render).toHaveBeenCalledWith(
      'view-orders-and-notices',
      expect.objectContaining({
        caseReference: '1777570813792018',
        backUrl: '/case/1777570813792018/dashboard',
        documentFolders: [
          {
            title: 'Enforcement',
            documents: [
              {
                id: '9d4eb1a1-4e6a-4f25-9f14-1dd1dbd0a4f1',
                filename: 'notice-of-eviction.pdf',
                submittedOn: '2026-07-01',
              },
            ],
          },
        ],
      })
    );
  });

  it('renders no folders when the case has no enforcement documents', async () => {
    mockGetCaseById.mockResolvedValue({
      id: '1777570813792018',
      data: {
        allDocuments: [
          {
            id: '181c89a0-ae0a-4b6b-aff4-36bd8b8122aa',
            value: {
              document_filename: 'claim-form.pdf',
              document_binary_url: 'http://doc-store/claim-form/binary',
              category_id: 'statementsOfCase',
            },
          },
        ],
      },
    });

    const res = { render: jest.fn() } as unknown as Response;
    await getHandler()(buildRequest(), res, jest.fn());

    expect(res.render).toHaveBeenCalledWith(
      'view-orders-and-notices',
      expect.objectContaining({ documentFolders: [] })
    );
  });

  it('passes a 401 to next when the user has no access token', async () => {
    const res = { render: jest.fn() } as unknown as Response;
    const next = jest.fn();

    await getHandler()({ params: { caseReference: '1777570813792018' }, session: {} } as unknown as Request, res, next);

    expect(mockGetCaseById).not.toHaveBeenCalled();
    expect(res.render).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('passes a case read failure to next', async () => {
    const error = new Error('CCD unavailable');
    mockGetCaseById.mockRejectedValue(error);

    const res = { render: jest.fn() } as unknown as Response;
    const next = jest.fn();

    await getHandler()(buildRequest(), res, next);

    expect(res.render).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});
