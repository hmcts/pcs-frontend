import * as os from 'os';

import { InfoContributor, infoRequestHandler } from '@hmcts/info-provider';
import config from 'config';
import { Router } from 'express';

import infoRoute from '../../../main/routes/info';

jest.mock('os');
jest.mock('config');
jest.mock('@hmcts/info-provider');
jest.mock('express', () => ({
  Router: jest.fn().mockReturnValue({
    get: jest.fn(),
  }),
}));

describe('info route', () => {
  let app: Router;
  const originalUptime = process.uptime;

  beforeEach(() => {
    jest.clearAllMocks();
    app = Router();
    (config.get as jest.Mock).mockReturnValue('http://fake-api-url');
    (os.hostname as jest.Mock).mockReturnValue('fake-hostname');
    process.uptime = jest.fn().mockReturnValue(12345);
    (infoRequestHandler as jest.Mock).mockReturnValue(jest.fn());
  });

  afterEach(() => {
    process.uptime = originalUptime;
  });

  it('should set up the /info route with the correct handler', () => {
    infoRoute(app);

    expect(app.get).toHaveBeenCalledWith('/info', expect.any(Function));

    const handler = (app.get as jest.Mock).mock.calls[0][1];
    const req = {};
    const res = { json: jest.fn() };
    const next = jest.fn();

    handler(req, res, next);

    expect(infoRequestHandler).toHaveBeenCalledWith({
      extraBuildInfo: {
        host: 'fake-hostname',
        name: 'pcs-frontend',
        uptime: 12345,
      },
      info: {
        'pcs-api': expect.any(InfoContributor),
      },
    });
  });
});
