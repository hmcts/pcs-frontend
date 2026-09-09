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

import {
  FetchPINsAndValidateAccessCodeAPIAction,
  pinUsers,
} from '../../ui/utils/actions/custom-actions/fetchPINsAndValidateAccessCodeAPI.action';

function axiosErrorWithStatus(status: number, data: unknown = {}): AxiosError {
  const config = { url: '/cases/1234', method: 'get', baseURL: 'http://ccd', headers: new AxiosHeaders() };
  const error = new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config as never);
  error.response = { status, data, statusText: '', headers: new AxiosHeaders(), config } as never;
  return error;
}

const issuedCase = { data: { state: 'CASE_ISSUED' } };
const pinPayload = {
  data: {
    ABC123: { firstName: 'Ada', lastName: 'Lovelace', nameKnown: 'YES', address: { AddressLine1: '1 High St' } },
  },
};

describe('FetchPINsAndValidateAccessCodeAPIAction', () => {
  const action = new FetchPINsAndValidateAccessCodeAPIAction();

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

  describe('fetchPINsAPI', () => {
    it('survives transient 404s on the case read before CASE_ISSUED', async () => {
      get
        .mockRejectedValueOnce(axiosErrorWithStatus(404))
        .mockRejectedValueOnce(axiosErrorWithStatus(404))
        .mockResolvedValueOnce(issuedCase)
        .mockResolvedValueOnce(pinPayload);

      await action.execute(undefined as never, 'fetchPINsAPI');

      expect(get).toHaveBeenCalledTimes(4);
      expect(pinUsers).toHaveLength(1);
      expect(pinUsers[0].pin).toBe('ABC123');
    });

    it('survives a transient 404 on the PIN read', async () => {
      get
        .mockResolvedValueOnce(issuedCase)
        .mockRejectedValueOnce(axiosErrorWithStatus(404))
        .mockResolvedValueOnce(pinPayload);

      await action.execute(undefined as never, 'fetchPINsAPI');

      expect(get).toHaveBeenCalledTimes(3);
      expect(pinUsers[0].firstName).toBe('Ada');
    });

    it('fails fast when the case read is forbidden', async () => {
      get.mockRejectedValue(axiosErrorWithStatus(403));

      await expect(action.execute(undefined as never, 'fetchPINsAPI')).rejects.toBeInstanceOf(AxiosError);
      expect(get).toHaveBeenCalledTimes(1);
    });

    it('fails with a descriptive error when 404s never clear', async () => {
      get.mockRejectedValue(axiosErrorWithStatus(404, { message: 'No case found' }));

      await expect(action.execute(undefined as never, 'fetchPINsAPI')).rejects.toThrow(
        /wait for CASE_ISSUED\) failed after 10 attempts/
      );
      expect(get).toHaveBeenCalledTimes(10);
    });

    it('reports the last observed state when the case never reaches CASE_ISSUED', async () => {
      get.mockResolvedValue({ data: { state: 'AWAITING_SUBMISSION' } });

      await expect(action.execute(undefined as never, 'fetchPINsAPI')).rejects.toThrow(
        /Case is not ISSUED\. Last observed status: AWAITING_SUBMISSION/
      );
    });
  });

  describe('validateAccessCodeAPI', () => {
    it('retries a transient failure then succeeds', async () => {
      post.mockRejectedValueOnce(axiosErrorWithStatus(503)).mockResolvedValue({ status: 200 });

      await action.execute(undefined as never, 'validateAccessCodeAPI');

      expect(post).toHaveBeenCalledTimes(2);
    });

    it('does not retry an unauthorised response', async () => {
      post.mockRejectedValue(axiosErrorWithStatus(401));

      await expect(action.execute(undefined as never, 'validateAccessCodeAPI')).rejects.toBeInstanceOf(AxiosError);
      expect(post).toHaveBeenCalledTimes(1);
    });
  });
});
