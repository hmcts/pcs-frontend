import type { AxiosError } from 'axios';
import config from 'config';

import { HTTPError } from '../../HttpError';

import type { CuiRaInvocationRequest, CuiRaInvocationResponse } from './cuiRa.interface';

import { http } from '@modules/http';
import { Logger } from '@modules/logger';

const logger = Logger.getLogger('cuiRaService');

function getBaseUrl(): string {
  return config.get<string>('cuiRa.url');
}

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
  logger.error(`cui-ra payload invocation failed: ${axiosError.message}`);
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
};
