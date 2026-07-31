import type { AxiosError } from 'axios';
import config from 'config';

import { HTTPError } from '../../HttpError';

import type { CuiRaGetPayloadResponse, CuiRaInvocationRequest, CuiRaInvocationResponse } from './cuiRa.interface';

import { http } from '@modules/http';
import { Logger } from '@modules/logger';

const logger = Logger.getLogger('cuiRaService');

function getBaseUrl(): string {
  return config.get<string>('cuiRa.url');
}

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
  // Invokes the Your Support microsite. Returns the microsite URL to redirect
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

  // Retrieves the result of a completed microsite session 
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
};
