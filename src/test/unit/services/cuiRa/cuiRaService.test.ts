import config from 'config';

import { HTTPError } from '../../../../main/HttpError';

import type { CuiRaInvocationRequest } from '@services/cuiRa/cuiRa.interface';
import { cuiRaService } from '@services/cuiRa/cuiRaService';

jest.mock('config', () => ({
  get: jest.fn(),
}));

jest.mock('@modules/http', () => ({
  http: {
    post: jest.fn(),
  },
}));

const cuiRaBase = 'http://mock-cui-ra';
const mockHttp = require('../../../../main/modules/http').http;

const sampleBody: CuiRaInvocationRequest = {
  callbackUrl: 'http://frontend/case/123/respond-to-claim/reasonable-adjustments/callback/:id',
  logoutUrl: 'http://frontend/logout',
  language: 'en',
  existingFlags: { partyName: 'John Doe', roleOnCase: 'Defendant', details: [] },
  hmctsServiceId: 'AAA3',
  masterFlagCode: 'RA0001',
  correlationId: '123',
};

describe('cuiRaService.invokePayload', () => {
  beforeEach(() => {
    (config.get as jest.Mock).mockReturnValue(cuiRaBase);
    jest.clearAllMocks();
  });

  it('posts to /api/payload with idam-token and service-token headers and returns the microsite url', async () => {
    mockHttp.post.mockResolvedValue({ data: { url: 'https://cui-ra/microsite/abc' } });

    const url = await cuiRaService.invokePayload({
      accessToken: 'idam-tok',
      serviceToken: 's2s-tok',
      body: sampleBody,
    });

    expect(url).toBe('https://cui-ra/microsite/abc');
    expect(mockHttp.post).toHaveBeenCalledWith(`${cuiRaBase}/api/payload`, sampleBody, {
      headers: {
        'idam-token': 'Bearer idam-tok',
        'service-token': 's2s-tok',
        'Content-Type': 'application/json',
      },
    });
  });

  it('wraps an upstream failure as an HTTPError preserving the status', async () => {
    mockHttp.post.mockRejectedValue({ message: 'boom', response: { status: 502 } });

    await expect(
      cuiRaService.invokePayload({ accessToken: 'idam-tok', serviceToken: 's2s-tok', body: sampleBody })
    ).rejects.toMatchObject({ status: 502 });
  });

  it('defaults to a 500 HTTPError when there is no upstream status', async () => {
    mockHttp.post.mockRejectedValue({ message: 'network down' });

    const promise = cuiRaService.invokePayload({ accessToken: 'x', serviceToken: 'y', body: sampleBody });

    await expect(promise).rejects.toBeInstanceOf(HTTPError);
    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});
