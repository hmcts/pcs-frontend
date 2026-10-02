import type { Application, Request, Response } from 'express';

const mockGetUserType = jest.fn();
const mockIsAccessControlEnabled = jest.fn();

jest.mock('config', () => ({ get: jest.fn().mockReturnValue(20) }));

jest.mock('../../../main/steps/utils', () => ({
  getUserType: (...args: unknown[]) => mockGetUserType(...args),
}));

jest.mock('../../../main/utils/isAccessControlEnabled', () => ({
  isAccessControlEnabled: (...args: unknown[]) => mockIsAccessControlEnabled(...args),
}));

import activeRoutes from '../../../main/routes/active';

describe('GET /active', () => {
  let handler: (req: Request, res: Response) => Promise<void>;

  const makeRes = (): Response & { status: jest.Mock; send: jest.Mock } => {
    const res = {} as Response & { status: jest.Mock; send: jest.Mock };
    res.status = jest.fn().mockReturnThis() as jest.Mock;
    res.send = jest.fn().mockReturnThis() as jest.Mock;
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAccessControlEnabled.mockResolvedValue(true);
    const app = {
      get: jest.fn((_path: string, h: (req: Request, res: Response) => Promise<void>) => {
        handler = h;
      }),
    } as unknown as Application;
    activeRoutes(app);
  });

  it('returns 401 when there is no session', async () => {
    const res = makeRes();
    await handler({ session: undefined } as unknown as Request, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when the session role is not permitted, without extending', async () => {
    mockGetUserType.mockReturnValue('unauthorised');
    const save = jest.fn();
    const res = makeRes();

    await handler({ session: { cookie: {}, save } } as unknown as Request, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(save).not.toHaveBeenCalled();
  });

  it('extends the session for a permitted role', async () => {
    mockGetUserType.mockReturnValue('citizen');
    const save = jest.fn((cb: (err: unknown) => void) => cb(null));
    const res = makeRes();

    await handler({ session: { cookie: {}, save } } as unknown as Request, res);

    expect(save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('extends the session for an unauthorised role when access control is disabled', async () => {
    mockIsAccessControlEnabled.mockResolvedValue(false);
    mockGetUserType.mockReturnValue('unauthorised');
    const save = jest.fn((cb: (err: unknown) => void) => cb(null));
    const res = makeRes();

    await handler({ session: { cookie: {}, save } } as unknown as Request, res);

    expect(save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
