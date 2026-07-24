import axios from 'axios';
import config from 'config';

import { HTTPError } from '../../../../main/HttpError';

import type { CuiRaInvocationRequest } from '@services/cuiRa/cuiRa.interface';
import { cuiRaService } from '@services/cuiRa/cuiRaService';

jest.mock('config', () => ({
  get: jest.fn(),
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('@modules/http', () => ({
  http: {
    post: jest.fn(),
    get: jest.fn(),
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

describe('cuiRaService.getPayload', () => {
  beforeEach(() => {
    (config.get as jest.Mock).mockReturnValue(cuiRaBase);
    jest.clearAllMocks();
  });

  it('gets /api/payload/:id with only the service-token header and returns the payload', async () => {
    const responsePayload = {
      action: 'submit',
      correlationId: '123',
      replacementFlags: { partyName: 'John Doe', roleOnCase: 'Defendant', details: [] },
    };
    mockHttp.get.mockResolvedValue({ data: responsePayload });

    const payload = await cuiRaService.getPayload('abc-123', 's2s-tok');

    expect(payload).toEqual(responsePayload);
    expect(mockHttp.get).toHaveBeenCalledWith(`${cuiRaBase}/api/payload/abc-123`, {
      headers: { 'service-token': 's2s-tok', accept: 'application/json' },
    });
  });

  it('url-encodes the id', async () => {
    mockHttp.get.mockResolvedValue({ data: { action: 'cancel', correlationId: '1' } });

    await cuiRaService.getPayload('a/b c', 's2s-tok');

    expect(mockHttp.get).toHaveBeenCalledWith(`${cuiRaBase}/api/payload/a%2Fb%20c`, expect.anything());
  });

  it('wraps a failure as an HTTPError', async () => {
    mockHttp.get.mockRejectedValue({ message: 'boom', response: { status: 404 } });

    await expect(cuiRaService.getPayload('missing', 's2s-tok')).rejects.toMatchObject({ status: 404 });
  });
});

describe('cuiRaService.isHealthy', () => {
  beforeEach(() => {
    (config.get as jest.Mock).mockReturnValue(cuiRaBase);
    jest.clearAllMocks();
  });

  it('returns true when /health responds with root status UP, probed with a timeout', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ status: 200, data: { status: 'UP', checks: {} } });

    await expect(cuiRaService.isHealthy()).resolves.toBe(true);
    expect(axios.get).toHaveBeenCalledWith(
      `${cuiRaBase}/health`,
      expect.objectContaining({ timeout: expect.any(Number) })
    );
  });

  it('returns false when the root status is not UP', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ status: 200, data: { status: 'DOWN' } });

    await expect(cuiRaService.isHealthy()).resolves.toBe(false);
  });

  it('returns false when the body has no status', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ status: 200, data: {} });

    await expect(cuiRaService.isHealthy()).resolves.toBe(false);
  });

  it('returns false when the health endpoint is unavailable / errors / times out', async () => {
    (axios.get as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(cuiRaService.isHealthy()).resolves.toBe(false);
  });
});
