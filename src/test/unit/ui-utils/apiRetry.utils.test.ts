import { AxiosError, AxiosHeaders } from 'axios';

import { describeApiError, isTransientApiError, pollApi } from '../../ui/utils/common/apiRetry.utils';

const fastOptions = { initialDelayMs: 1, maxDelayMs: 1 };

type CaseResponse = { data: { state: string } };

function axiosErrorWithStatus(status: number, data: unknown = {}): AxiosError {
  const config = { url: '/cases/1234', method: 'get', baseURL: 'http://ccd', headers: new AxiosHeaders() };
  const error = new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config as never);
  error.response = { status, data, statusText: '', headers: new AxiosHeaders(), config } as never;
  return error;
}

function axiosNetworkError(): AxiosError {
  const config = { url: '/cases/1234', method: 'get', baseURL: 'http://ccd', headers: new AxiosHeaders() };
  return new AxiosError('socket hang up', 'ECONNRESET', config as never);
}

describe('apiRetry utils', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isTransientApiError', () => {
    it.each([404, 408, 425, 429, 502, 503, 504])('treats %s as transient', status => {
      expect(isTransientApiError(axiosErrorWithStatus(status))).toBe(true);
    });

    it.each([400, 401, 403, 409, 422, 500])('treats %s as non-transient', status => {
      expect(isTransientApiError(axiosErrorWithStatus(status))).toBe(false);
    });

    it('treats a network error with no response as transient', () => {
      expect(isTransientApiError(axiosNetworkError())).toBe(true);
    });

    it('treats a non-axios error as non-transient', () => {
      expect(isTransientApiError(new TypeError('boom'))).toBe(false);
    });
  });

  describe('describeApiError', () => {
    it('includes method, url, status and response detail', () => {
      const summary = describeApiError(axiosErrorWithStatus(404, { message: 'Case not found' }));
      expect(summary).toBe('GET http://ccd/cases/1234 -> 404 (Case not found)');
    });

    it('reports a missing response', () => {
      expect(describeApiError(axiosNetworkError())).toContain('no response');
    });

    it('falls back to the message for non-axios errors', () => {
      expect(describeApiError(new Error('plain failure'))).toBe('plain failure');
    });
  });

  describe('pollApi retrying transient failures', () => {
    it('returns the result once a transient 404 clears', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(axiosErrorWithStatus(404))
        .mockRejectedValueOnce(axiosErrorWithStatus(404))
        .mockResolvedValue({ status: 200, data: { state: 'CASE_ISSUED' } });

      const result = await pollApi(operation, { description: 'read case', ...fastOptions });

      expect(result).toEqual({ status: 200, data: { state: 'CASE_ISSUED' } });
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('throws a descriptive error once transient retries are exhausted', async () => {
      const operation = jest.fn().mockRejectedValue(axiosErrorWithStatus(404, { message: 'No case found' }));

      await expect(pollApi(operation, { description: 'read case', maxAttempts: 4, ...fastOptions })).rejects.toThrow(
        'read case failed after 4 attempts. Last failure: GET http://ccd/cases/1234 -> 404'
      );

      expect(operation).toHaveBeenCalledTimes(4);
    });

    it('logs full diagnostics when retries are exhausted', async () => {
      const operation = jest.fn().mockRejectedValue(axiosErrorWithStatus(404, { message: 'No case found' }));

      await expect(pollApi(operation, { description: 'read case', maxAttempts: 2, ...fastOptions })).rejects.toThrow();

      expect(errorSpy).toHaveBeenCalledWith('Summary:', 'GET http://ccd/cases/1234 -> 404 (No case found)');
    });

    it('retries network errors that produced no response', async () => {
      const operation = jest.fn().mockRejectedValueOnce(axiosNetworkError()).mockResolvedValue({ status: 200 });

      await expect(pollApi(operation, { description: 'read case', ...fastOptions })).resolves.toEqual({ status: 200 });
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('pollApi failing fast on real defects', () => {
    it.each([401, 403, 400, 422, 500])('does not retry a %s response', async status => {
      const operation = jest.fn().mockRejectedValue(axiosErrorWithStatus(status));

      await expect(pollApi(operation, { description: 'read case', ...fastOptions })).rejects.toBeInstanceOf(AxiosError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('does not retry a non-axios error', async () => {
      const operation = jest.fn().mockRejectedValue(new TypeError('bad payload'));

      await expect(pollApi(operation, { description: 'read case', ...fastOptions })).rejects.toThrow('bad payload');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('pollApi waiting for a readiness condition', () => {
    it('polls until the expected state is reached', async () => {
      const operation = jest
        .fn()
        .mockResolvedValueOnce({ data: { state: 'AWAITING_SUBMISSION' } })
        .mockResolvedValueOnce({ data: { state: 'PENDING' } })
        .mockResolvedValue({ data: { state: 'CASE_ISSUED' } });

      const result = await pollApi<CaseResponse>(operation, {
        description: 'wait for CASE_ISSUED',
        isReady: response => response.data.state === 'CASE_ISSUED',
        ...fastOptions,
      });

      expect(result.data.state).toBe('CASE_ISSUED');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('reports the last observed state when readiness is never reached', async () => {
      const operation = jest.fn().mockResolvedValue({ data: { state: 'PENDING' } });

      await expect(
        pollApi<CaseResponse>(operation, {
          description: 'wait for CASE_ISSUED',
          isReady: response => response.data.state === 'CASE_ISSUED',
          describeNotReady: response => `Last observed status: ${response?.data?.state}`,
          maxAttempts: 3,
          ...fastOptions,
        })
      ).rejects.toThrow('wait for CASE_ISSUED did not become ready after 3 attempts. Last observed status: PENDING');

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('recovers when a transient failure precedes the ready state', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(axiosErrorWithStatus(404))
        .mockResolvedValueOnce({ data: { state: 'PENDING' } })
        .mockResolvedValue({ data: { state: 'CASE_ISSUED' } });

      const result = await pollApi<CaseResponse>(operation, {
        description: 'wait for CASE_ISSUED',
        isReady: response => response.data.state === 'CASE_ISSUED',
        ...fastOptions,
      });

      expect(result.data.state).toBe('CASE_ISSUED');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('applies capped exponential backoff between attempts', async () => {
      const delays: number[] = [];
      jest.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void, ms?: number) => {
        delays.push(ms ?? 0);
        callback();
        return 0;
      }) as unknown as typeof setTimeout);

      const operation = jest.fn().mockRejectedValue(axiosErrorWithStatus(404));

      await expect(
        pollApi(operation, { description: 'read case', maxAttempts: 5, initialDelayMs: 500, maxDelayMs: 2000 })
      ).rejects.toThrow();

      expect(delays).toEqual([500, 1000, 2000, 2000]);
    });
  });
});
