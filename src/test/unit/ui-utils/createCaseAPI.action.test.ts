import { AxiosError, AxiosHeaders } from 'axios';

const get = jest.fn();
const post = jest.fn();

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    __esModule: true,
    ...actual,
    default: { ...actual.default, create: jest.fn(() => ({ get, post })) },
  };
});

jest.mock('../../ui/utils/controller', () => ({ performAction: jest.fn() }));

import { CreateCaseAPIAction } from '../../ui/utils/actions/custom-actions/createCaseAPI.action';

function axiosErrorWithStatus(status: number, data: unknown = {}): AxiosError {
  const config = { url: '/cases/1234', method: 'get', baseURL: 'http://ccd', headers: new AxiosHeaders() };
  const error = new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config as never);
  error.response = { status, data, statusText: '', headers: new AxiosHeaders(), config } as never;
  return error;
}

const eventToken = { status: 200, data: { token: 'event-token' } };

describe('CreateCaseAPIAction', () => {
  const action = new CreateCaseAPIAction();

  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    process.env.CASE_NUMBER = '1234123412341234';
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void) => {
      callback();
      return 0;
    }) as unknown as typeof setTimeout);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('submitCaseAPI', () => {
    it('survives transient 404s on the event-trigger read', async () => {
      get
        .mockRejectedValueOnce(axiosErrorWithStatus(404))
        .mockRejectedValueOnce(axiosErrorWithStatus(404))
        .mockResolvedValue(eventToken);
      post.mockResolvedValue({ status: 201 });

      await action.execute(undefined as never, 'submitCaseAPI', { data: {} });

      expect(get).toHaveBeenCalledTimes(3);
      expect(post).toHaveBeenCalledTimes(1);
    });

    it('fails fast when the event trigger is forbidden', async () => {
      get.mockRejectedValue(axiosErrorWithStatus(403));

      await expect(action.execute(undefined as never, 'submitCaseAPI', { data: {} })).rejects.toBeInstanceOf(
        AxiosError
      );
      expect(get).toHaveBeenCalledTimes(1);
    });

    it('reports request context when 404s never clear', async () => {
      get.mockRejectedValue(axiosErrorWithStatus(404, { message: 'No case found' }));

      await expect(action.execute(undefined as never, 'submitCaseAPI', { data: {} })).rejects.toThrow(
        /submit case\) failed after 10 attempts\. Last failure: GET http:\/\/ccd\/cases\/1234 -> 404/
      );
      expect(get).toHaveBeenCalledTimes(10);
    });
  });

  describe('createCaseAPI', () => {
    it('stores the case reference once creation succeeds after a transient failure', async () => {
      get.mockRejectedValueOnce(axiosErrorWithStatus(503)).mockResolvedValue(eventToken);
      post.mockResolvedValue({ status: 201, data: { id: '1111222233334444' } });

      await action.execute(undefined as never, 'createCaseAPI', { data: {} });

      expect(process.env.CASE_NUMBER).toBe('1111222233334444');
      expect(process.env.CASE_FID).toBe('1111 2222 3333 4444');
    });

    it('does not retry a validation failure on create', async () => {
      get.mockResolvedValue(eventToken);
      post.mockRejectedValue(axiosErrorWithStatus(422));

      await expect(action.execute(undefined as never, 'createCaseAPI', { data: {} })).rejects.toBeInstanceOf(
        AxiosError
      );
      expect(post).toHaveBeenCalledTimes(1);
    });
  });
});
