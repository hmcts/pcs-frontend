import { Logger } from '@hmcts/nodejs-logging';
import { AxiosError } from 'axios';
import config from 'config';

import { HTTPError } from '../HttpError';
import type { CaseState, CcdCase, CcdUserCases, StartCallbackData } from '../interfaces/ccdCase.interface';
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

function convertAxiosErrorToHttpError(error: unknown, context: string): HTTPError {
  const axiosError = error as AxiosError;
  const status = axiosError.response?.status;

  logger.error(`[ccdCaseService] Error in ${context}: ${axiosError.message}`);
  if (axiosError.response?.data) {
    logger.error(`[ccdCaseService] Error response data: ${JSON.stringify(axiosError.response.data, null, 2)}`);
  }

  if (status === 401 || status === 403) {
    return new HTTPError('Not authorised to access CCD case service', 403);
  }

  return new HTTPError(`CCD case service error: ${axiosError.message || 'Unknown error'}`, 500);
}

async function getEventToken(userToken: string, url: string): Promise<string> {
  try {
    logger.info(`[ccdCaseService] Calling getEventToken with URL: ${url}`);
    const response = await http.get<EventTokenResponse>(url, getCaseHeaders(userToken));
    logger.info(`[ccdCaseService] Response data: ${JSON.stringify(response.data, null, 2)}`);
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
    logger.info(`[ccdCaseService] Calling submitEvent with URL: ${url}`);
    logger.info(`[ccdCaseService] Payload: ${JSON.stringify(payload, null, 2)}`);
    const response = await http.post<CcdCase>(url, payload, getCaseHeaders(userToken));
    logger.info(`[ccdCaseService] Response data: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (error) {
    throw convertAxiosErrorToHttpError(error, 'submitEvent');
  }
}

export const ccdCaseService = {
  async getCase(accessToken: string | undefined): Promise<CcdCase | null> {
    const url = `${getBaseUrl()}/searchCases?ctid=${getCaseTypeId()}`;
    const headersConfig = getCaseHeaders(accessToken || '');

    const requestBody = {
      query: { match_all: {} },
      sort: [{ created_date: { order: 'desc' } }],
    };

    logger.info(`[ccdCaseService] Calling ccdCaseService search with URL: ${url}`);
    logger.info(`[ccdCaseService] Request body: ${JSON.stringify(requestBody, null, 2)}`);

    try {
      const response = await http.post<CcdUserCases>(url, requestBody, headersConfig);
      const allCases = response?.data?.cases;
      logger.info(`[ccdCaseService] Response data: ${JSON.stringify(response?.data?.cases, null, 2)}`);
      const draftCase = allCases?.find(c => c.state === CaseState.DRAFT);

      if (draftCase) {
        return {
          id: draftCase.id,
          data: draftCase.case_data,
        };
      }

      return null;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        logger.warn('[ccdCaseService] No case found, returning null.');
        return null;
      }
      if (axiosError.response?.status === 400) {
        logger.warn(
          `[ccdCaseService] Bad request (400) when searching for cases. Response: ${JSON.stringify(
            axiosError.response?.data,
            null,
            2
          )}`
        );
        return null;
      }
      throw convertAxiosErrorToHttpError(error, 'getCase');
    }
  },

  async createCase(accessToken: string | undefined, data: Record<string, unknown>): Promise<CcdCase> {
    const eventUrl = `${getBaseUrl()}/case-types/${getCaseTypeId()}/event-triggers/citizenCreateApplication`;
    const eventToken = await getEventToken(accessToken || '', eventUrl);
    const url = `${getBaseUrl()}/case-types/${getCaseTypeId()}/cases`;
    return submitEvent(accessToken || '', url, 'citizenCreateApplication', eventToken, data);
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

  async submitResponseToClaim(accessToken: string | undefined, ccdCase: CcdCase): Promise<CcdCase> {
    if (!ccdCase.id) {
      throw new HTTPError('Cannot Submit Response to Case, CCD Case Not found', 500);
    }
    const eventUrl = `${getBaseUrl()}/cases/${ccdCase.id}/event-triggers/respondPossessionClaim`;
    const eventToken = await getEventToken(accessToken || '', eventUrl);
    const url = `${getBaseUrl()}/cases/${ccdCase.id}/events`;

    return submitEvent(accessToken || '', url, 'respondPossessionClaim', eventToken, ccdCase.data);
  },

  async getExistingCaseData(accessToken: string | undefined, ccdCaseId: string): Promise<StartCallbackData> {
    const eventUrl = `${getBaseUrl()}/cases/${ccdCaseId}/event-triggers/respondPossessionClaim?ignore-warning=false`;

    try {
      const response = await http.get<StartCallbackData>(eventUrl, getCaseHeaders(accessToken || ''));
      return response.data;
    } catch (error) {
      throw convertAxiosErrorToHttpError(error, 'getExistingCaseDataError');
    }
  },
};
