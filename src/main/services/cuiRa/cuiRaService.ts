import axios, { type AxiosError } from 'axios';
import config from 'config';

import { HTTPError } from '../../HttpError';

import type { CuiRaGetPayloadResponse, CuiRaInvocationRequest, CuiRaInvocationResponse } from './cuiRa.interface';

import { http } from '@modules/http';
import { Logger } from '@modules/logger';

const logger = Logger.getLogger('cuiRaService');

function getBaseUrl(): string {
  return config.get<string>('cuiRa.url');
}

// Health-probe timeout. A slow/hanging /health must fail fast so we skip Your Support quickly.
// Kept as a constant (not config) to avoid touching config/default.json; move to config if
// per-environment tuning is ever needed.
const HEALTH_TIMEOUT_MS = 3000;

// cui-ra authenticates the citizen via `idam-token` (Bearer) and the service via
// `service-token` (the raw S2S token, no "Bearer" prefix). The shared http client
// also attaches its own `ServiceAuthorization` header, which cui-ra ignores.
function buildHeaders(accessToken: string, serviceToken: string) {
  return {
    headers: {
      'idam-token': `Bearer ${accessToken}`,
      'service-token': serviceToken,
      'Content-Type': 'application/json',
    },
  };
}

function toHttpError(error: unknown): HTTPError {
  if (error instanceof HTTPError) {
    return error;
  }
  const axiosError = error as AxiosError;
  const status = axiosError.response?.status;
  logger.error(`cui-ra request failed: ${axiosError.message}`);
  return new HTTPError(`cui-ra service error: ${axiosError.message || 'Unknown error'}`, status || 500);
}

export interface InvokePayloadInput {
  accessToken: string;
  serviceToken: string;
  body: CuiRaInvocationRequest;
}

export const cuiRaService = {
  // Invokes the Your Support microsite for a party. Returns the microsite URL the
  // browser should be redirected to so the citizen can answer the YS questions.
  async invokePayload({ accessToken, serviceToken, body }: InvokePayloadInput): Promise<string> {
    try {
      const response = await http.post<CuiRaInvocationResponse>(
        `${getBaseUrl()}/api/payload`,
        body,
        buildHeaders(accessToken, serviceToken)
      );
      return response.data.url;
    } catch (error) {
      throw toHttpError(error);
    }
  },

  // Retrieves the result of a completed microsite session (Step 4: GET /api/payload/:id).
  // This endpoint is S2S-only — it takes the `service-token` header, not the citizen idam-token.
  async getPayload(id: string, serviceToken: string): Promise<CuiRaGetPayloadResponse> {
    try {
      const response = await http.get<CuiRaGetPayloadResponse>(
        `${getBaseUrl()}/api/payload/${encodeURIComponent(id)}`,
        { headers: { 'service-token': serviceToken, accept: 'application/json' } }
      );
      return response.data;
    } catch (error) {
      throw toHttpError(error);
    }
  },

  // Checks cui-ra /health before launching the microsite. /health is public (no S2S/idam), so we
  // probe it with a plain axios call — independent of our shared http client and S2S token — and a
  // short timeout. Healthy ONLY when we get a response whose root `status` is 'UP' (nested
  // frontend/backend component checks are intentionally ignored). Every other condition — non-2xx,
  // status !== 'UP', unreachable, timeout, malformed body — returns false so the caller skips YS.
  async isHealthy(): Promise<boolean> {
    const url = `${getBaseUrl()}/healthbbbb`;
    try {
      const response = await axios.get(url, { timeout: HEALTH_TIMEOUT_MS, headers: { accept: 'application/json' } });
      const healthy = response.data?.status === 'UP';
      if (!healthy) {
        logger.warn(`cui-ra health status is '${response.data?.status}' (not UP) — skipping Your Support`);
      }
      return healthy;
    } catch (error) {
      logger.warn(`cui-ra health check failed — skipping Your Support: ${(error as Error).message}`);
      return false;
    }
  },
};
