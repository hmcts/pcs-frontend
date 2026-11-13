import config from 'config';
import type { Application, Request, Response } from 'express';

import activeRoute from '@routes/active';

jest.mock('config');

function registerHandler(): (req: Request, res: Response) => void {
  const app = { get: jest.fn() } as unknown as Application;
  activeRoute(app);
  return (app.get as jest.Mock).mock.calls[0][1];
}

function buildResponse(): { response: Response; status: jest.Mock; send: jest.Mock } {
  const send = jest.fn();
  const status = jest.fn().mockReturnValue({ send });
  return { response: { status } as unknown as Response, status, send };
}

describe('/active', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (config.get as jest.Mock).mockReturnValue(60);
  });

  it('does not save a new anonymous session', () => {
    const save = jest.fn();
    const request = {
      session: { cookie: {}, save },
    } as unknown as Request;
    const { response, status, send } = buildResponse();

    registerHandler()(request, response);

    expect(save).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith('No active session');
  });

  it('extends and saves an authenticated session', () => {
    const save = jest.fn((callback: (error?: Error) => void) => callback());
    const cookie: Record<string, unknown> = {};
    const request = {
      session: { user: { accessToken: 'token' }, cookie, save },
    } as unknown as Request;
    const { response, status, send } = buildResponse();

    registerHandler()(request, response);

    expect(save).toHaveBeenCalledTimes(1);
    expect(cookie.maxAge).toBe(60 * 60 * 1000);
    expect(cookie.expires).toBeInstanceOf(Date);
    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith('Session extended');
  });

  it('reports a session-store failure', () => {
    const save = jest.fn((callback: (error?: Error) => void) => callback(new Error('Redis unavailable')));
    const request = {
      session: { user: { accessToken: 'token' }, cookie: {}, save },
    } as unknown as Request;
    const { response, status, send } = buildResponse();

    registerHandler()(request, response);

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith('Failed to extend session');
  });
});
