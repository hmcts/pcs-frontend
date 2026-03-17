import { Logger } from '@hmcts/nodejs-logging';
import { createCcdClient, type CcdClientConfig, type CcdSubmitResult, type CcdTransport } from '@hmcts/ccd-event-runtime';
import { AxiosError } from 'axios';
import config from 'config';

import { caseBindings, type CreateClaimData, type SubmitDefendantResponseData } from '../generated/ccd/PCS';
import { HTTPError } from '../HttpError';
import { CaseState } from '../interfaces/ccdCase.interface';
import type { CcdCase, CcdUserCases } from '../interfaces/ccdCase.interface';
import { http } from '../modules/http';

const logger = Logger.getLogger('ccdCaseService');

interface EventTokenResponse {
  token: string;
}

function getBaseUrl(): string {
  return config.get('ccd.url');
}

function getCaseTypeId(): string {
  return config.get('ccd.caseTypeId');
}

function getCaseHeaders(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      experimental: true,
      Accept: '*/*',
      'Content-Type': 'application/json',
    },
  };
}

function getGeneratedClientHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    experimental: 'true',
    Accept: '*/*',
    'Content-Type': 'application/json',
  };
}

function createTransport(): CcdTransport {
  return {
    get: async (url, headers) => (await http.get(url, { headers })).data,
    post: async (url, data, headers) => (await http.post(url, data, { headers })).data,
  };
}

function createGeneratedClient(userToken: string) {
  const clientConfig: CcdClientConfig = {
    baseUrl: getBaseUrl(),
    caseTypeId: getCaseTypeId(),
    getAuthHeaders: () => getGeneratedClientHeaders(userToken),
    transport: createTransport(),
  };

  return createCcdClient(clientConfig, caseBindings);
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function normaliseSubmitResult(result: CcdSubmitResult, fallbackData: Record<string, unknown>): CcdCase {
  const resultData = toRecord(result.data);

  return {
    id: String(result.id ?? ''),
    data: Object.keys(resultData).length > 0 ? resultData : fallbackData,
  };
}

function convertAxiosErrorToHttpError(error: unknown, context: string): HTTPError {
  const axiosError = error as AxiosError;
  const status = axiosError.response?.status;

  logger.error(`Error in ${context}: ${axiosError.message}`);
  if (axiosError.response?.data) {
    logger.error(`Error response data: ${JSON.stringify(axiosError.response.data, null, 2)}`);
  }

  if (status === 401 || status === 403) {
    return new HTTPError('Not authorised to access CCD case service', 403);
  }

  return new HTTPError(`CCD case service error: ${axiosError.message || 'Unknown error'}`, 500);
}

async function getEventToken(userToken: string, url: string): Promise<string> {
  try {
    logger.info(`Calling getEventToken with URL: ${url}`);
    const response = await http.get<EventTokenResponse>(url, getCaseHeaders(userToken));
    logger.info(`Response data: ${JSON.stringify(response.data, null, 2)}`);
    return response.data.token;
  } catch (error) {
    throw convertAxiosErrorToHttpError(error, 'getEventToken');
  }
}

async function submitEvent(
  userToken: string,
  url: string,
  eventId: string,
  eventToken: string,
  data: Record<string, unknown>
): Promise<CcdCase> {
  const payload = {
    data,
    event: {
      id: eventId,
      summary: `Citizen ${eventId} summary`,
      description: `Citizen ${eventId} description`,
    },
    event_token: eventToken,
    ignore_warning: false,
  };

  try {
    logger.info(`Calling submitEvent with URL: ${url}`);
    logger.info(`Payload: ${JSON.stringify(payload, null, 2)}`);
    const response = await http.post<CcdCase>(url, payload, getCaseHeaders(userToken));
    logger.info(`Response data: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (error) {
    throw convertAxiosErrorToHttpError(error, 'submitEvent');
  }
}

export const ccdCaseService = {
  async getCaseById(
    accessToken: string,
    caseId: string,
    eventId: string = 'submitDefendantResponse'
  ): Promise<CcdCase> {
    const eventUrl = `${getBaseUrl()}/cases/${caseId}/event-triggers/${eventId}?ignore-warning=false`;

    try {
      logger.info(`[ccdCaseService] Validating case access for caseId: ${caseId}, eventId: ${eventId}`);
      const response = await http.get<{ case_details?: { case_data?: Record<string, unknown> } }>(
        eventUrl,
        getCaseHeaders(accessToken)
      );
      logger.info(`[ccdCaseService] Case access validated successfully for caseId: ${caseId}`);

      return {
        id: caseId,
        data: response.data.case_details?.case_data || {},
      };
    } catch (error) {
      throw convertAxiosErrorToHttpError(error, 'getCaseById');
    }
  },

  async getCase(accessToken: string | undefined): Promise<CcdCase | null> {
    const url = `${getBaseUrl()}/searchCases?ctid=${getCaseTypeId()}`;
    const headersConfig = getCaseHeaders(accessToken || '');

    const requestBody = {
      query: { match_all: {} },
      sort: [{ created_date: { order: 'desc' } }],
    };

    logger.info(`Calling ccdCaseService search with URL: ${url}`);
    logger.info(`Request body: ${JSON.stringify(requestBody, null, 2)}`);

    try {
      const response = await http.post<CcdUserCases>(url, requestBody, headersConfig);
      const allCases = response?.data?.cases;
      logger.info(`Response data: ${JSON.stringify(response?.data?.cases, null, 2)}`);
      const draftCase = allCases?.find(c => c.state === CaseState.DRAFT);

      if (draftCase) {
        logger.info(`Draft case found: ${JSON.stringify(draftCase, null, 2)}`);
        return {
          id: draftCase.id,
          data: draftCase.case_data,
        };
      }

      return null;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        logger.warn('No case found, returning null.');
        return null;
      }
      if (axiosError.response?.status === 400) {
        logger.warn(
          `Bad request (400) when searching for cases. Response: ${JSON.stringify(axiosError.response?.data, null, 2)}`
        );
        return null;
      }
      throw convertAxiosErrorToHttpError(error, 'getCase');
    }
  },

  async createCase(accessToken: string | undefined, data: Partial<CreateClaimData>): Promise<CcdCase> {
    try {
      const client = createGeneratedClient(accessToken || '');
      const flow = await client.event('createPossessionClaim').start();
      const submitData: CreateClaimData = {
        ...flow.data,
        ...(data as Partial<CreateClaimData>),
      };
      const result = await flow.submit(submitData);

      return normaliseSubmitResult(result, submitData as unknown as Record<string, unknown>);
    } catch (error) {
      throw convertAxiosErrorToHttpError(error, 'createCase');
    }
  },

  async updateCase(accessToken: string | undefined, ccdCase: CcdCase): Promise<CcdCase> {
    if (!ccdCase.id) {
      throw new HTTPError('Cannot UPDATE Case, CCD Case Not found', 500);
    }

    const eventUrl = `${getBaseUrl()}/cases/${ccdCase.id}/event-triggers/citizenUpdateApplication`;
    const eventToken = await getEventToken(accessToken || '', eventUrl);
    const url = `${getBaseUrl()}/cases/${ccdCase.id}/events`;
    return submitEvent(accessToken || '', url, 'citizenUpdateApplication', eventToken, ccdCase.data);
  },

  async submitCase(accessToken: string | undefined, ccdCase: CcdCase): Promise<CcdCase> {
    if (!ccdCase.id) {
      throw new HTTPError('Cannot SUBMIT Case, CCD Case Not found', 500);
    }
    const eventUrl = `${getBaseUrl()}/cases/${ccdCase.id}/event-triggers/citizenSubmitApplication`;
    const eventToken = await getEventToken(accessToken || '', eventUrl);
    const url = `${getBaseUrl()}/cases/${ccdCase.id}/events`;
    return submitEvent(accessToken || '', url, 'citizenSubmitApplication', eventToken, ccdCase.data);
  },

  async submitResponseToClaim(
    accessToken: string | undefined,
    ccdCaseId: string,
    data: Partial<SubmitDefendantResponseData>
  ): Promise<CcdCase> {
    if (!ccdCaseId) {
      throw new HTTPError('Cannot Submit Response to Case, CCD Case Not found', 500);
    }

    try {
      const client = createGeneratedClient(accessToken || '');
      const flow = await client.event('submitDefendantResponse').start(ccdCaseId);
      const submitData: SubmitDefendantResponseData = {
        ...flow.data,
        ...data,
      };
      const result = await flow.submit(submitData);

      return normaliseSubmitResult(result, submitData as unknown as Record<string, unknown>);
    } catch (error) {
      throw convertAxiosErrorToHttpError(error, 'submitResponseToClaim');
    }
  },

  async getResponseToClaimData(
    accessToken: string | undefined,
    ccdCaseId: string
  ): Promise<SubmitDefendantResponseData> {
    if (!ccdCaseId) {
      throw new HTTPError('Cannot Load Response to Claim Data, CCD Case Not found', 500);
    }

    try {
      const client = createGeneratedClient(accessToken || '');
      const flow = await client.event('submitDefendantResponse').start(ccdCaseId);
      return flow.data;
    } catch (error) {
      throw convertAxiosErrorToHttpError(error, 'getResponseToClaimData');
    }
  },
};
