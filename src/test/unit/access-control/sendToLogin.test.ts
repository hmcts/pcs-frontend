import type { Request, Response } from 'express';

import { sendToLogin } from '../../../main/access-control/sendToLogin';

describe('sendToLogin', () => {
  it('destroys the session then redirects to /login', () => {
    const destroy = jest.fn((cb: () => void) => cb());
    const redirect = jest.fn();
    const req = { session: { destroy } } as unknown as Request;
    const res = { redirect } as unknown as Response;

    sendToLogin(req, res);

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to /login when there is no session to destroy', () => {
    const redirect = jest.fn();
    const req = { session: undefined } as unknown as Request;
    const res = { redirect } as unknown as Response;

    sendToLogin(req, res);

    expect(redirect).toHaveBeenCalledWith('/login');
  });
});
