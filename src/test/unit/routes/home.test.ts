import type { Application, Request, Response } from 'express';

import homeRoute from '@routes/home';

describe('home route', () => {
  let app: Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = { get: jest.fn() } as unknown as Application;
  });

  const getHandler = (): ((req: Request, res: Response) => void) => {
    homeRoute(app);
    return (app.get as jest.Mock).mock.calls[0][1];
  };

  it('registers a GET handler for /', () => {
    homeRoute(app);
    expect(app.get).toHaveBeenCalledWith('/', expect.any(Function));
  });

  it('redirects an authenticated user to /claims', () => {
    const handler = getHandler();
    const req = { session: { user: { sub: 'user-1' } } } as unknown as Request;
    const res = { redirect: jest.fn() } as unknown as Response;

    handler(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/claims');
  });

  it('redirects an unauthenticated user to /login', () => {
    const handler = getHandler();
    const req = { session: {} } as unknown as Request;
    const res = { redirect: jest.fn() } as unknown as Response;

    handler(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to /login when there is no session', () => {
    const handler = getHandler();
    const req = {} as unknown as Request;
    const res = { redirect: jest.fn() } as unknown as Response;

    handler(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/login');
  });
});
