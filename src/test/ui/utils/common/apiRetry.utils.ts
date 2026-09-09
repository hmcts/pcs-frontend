// eslint-disable-next-line import/no-named-as-default
import Axios from 'axios';

const TRANSIENT_HTTP_STATUSES = new Set([404, 408, 425, 429, 502, 503, 504]);

const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 5000;

export interface PollApiOptions<T> {
  description: string;
  isReady?: (result: T) => boolean;
  describeNotReady?: (result: T | undefined) => string;
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

export function isTransientApiError(error: unknown): boolean {
  if (!Axios.isAxiosError(error)) {
    return false;
  }
  const status = error.response?.status;
  if (status === undefined) {
    return true;
  }
  return TRANSIENT_HTTP_STATUSES.has(status);
}

export function describeApiError(error: unknown): string {
  if (!Axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : String(error);
  }

  const method = error.config?.method?.toUpperCase() ?? 'UNKNOWN';
  const url = `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}` || 'unknown url';
  const status = error.response?.status ?? 'no response';
  const body = error.response?.data;
  const detail = body?.message ?? body?.error ?? body?.exception ?? error.message;

  return `${method} ${url} -> ${status}${detail ? ` (${detail})` : ''}`;
}

export function logApiFailure(description: string, error: unknown): void {
  console.error('=== ERROR RESPONSE ===');
  console.error('Operation:', description);
  console.error('Summary:', describeApiError(error));

  if (Axios.isAxiosError(error)) {
    const body = error.response?.data;
    console.error('HTTP Status:', error.response?.status);
    console.error('Exception:', body?.exception);
    console.error('Error:', body?.error);
    console.error('Message:', body?.message);
    console.error('Path:', body?.path);
    console.error('Timestamp:', body?.timestamp);
    console.error('Full response body:', JSON.stringify(body, null, 2));
  }
}

function nextDelayMs(attempt: number, initialDelayMs: number, maxDelayMs: number): number {
  return Math.min(initialDelayMs * 2 ** (attempt - 1), maxDelayMs);
}

export async function pollApi<T>(operation: () => Promise<T>, options: PollApiOptions<T>): Promise<T> {
  const {
    description,
    isReady = () => true,
    describeNotReady,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
  } = options;

  let lastResult: T | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      if (isReady(result)) {
        return result;
      }
      lastResult = result;
    } catch (error: unknown) {
      if (!isTransientApiError(error)) {
        logApiFailure(description, error);
        throw error;
      }
      if (attempt === maxAttempts) {
        logApiFailure(description, error);
        throw new Error(
          `${description} failed after ${maxAttempts} attempts. Last failure: ${describeApiError(error)}`
        );
      }
      console.warn(
        `${description}: transient failure on attempt ${attempt}/${maxAttempts} - ${describeApiError(error)}`
      );
    }

    if (attempt === maxAttempts) {
      break;
    }

    await new Promise(resolve => setTimeout(resolve, nextDelayMs(attempt, initialDelayMs, maxDelayMs)));
  }

  const notReady = describeNotReady ? describeNotReady(lastResult) : 'condition was not met';
  throw new Error(`${description} did not become ready after ${maxAttempts} attempts. ${notReady}`);
}
