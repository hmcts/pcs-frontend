import { Logger } from '@hmcts/nodejs-logging';
import { AxiosError } from 'axios';
import config from 'config';

import { CaseState, CcdCase, CcdUserCases, UserJourneyCaseData } from '../interfaces/ccdCase.interface';
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

async function getEventToken(userToken: string, url: string): Promise<string> {
  try {
    logger.info(`[ccdCaseService] Calling getEventToken with URL: ${url}`);
    const response = await http.get<EventTokenResponse>(url, getCaseHeaders(userToken));
    logger.debug(`[ccdCaseService] Response data: ${JSON.stringify(response.data, null, 2)}`);
    return response.data.token;
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error(`[ccdCaseService] Unexpected error: ${axiosError.message}`);
    throw error;
  }
}

async function submitEvent(
  userToken: string,
  url: string,
  eventId: string,
  eventToken: string,
  data: UserJourneyCaseData
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
    logger.debug(`[ccdCaseService] Response data: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error(`[ccdCaseService] Unexpected error: ${axiosError.message}`);
    throw error;
  }
}

export const ccdCaseService = {
  async getCaseByReference(caseReference: number, accessToken: string | undefined): Promise<CcdCase> {
    const url = `${getBaseUrl()}/cases/${caseReference}`;

    logger.debug(`URL is ${url}`);
    logger.debug(`token is ${accessToken}`);
    const headersConfig = getCaseHeaders(accessToken || '');

    const response = await http.get<CcdCase>(url, headersConfig);

    logger.debug(`Status = ${response.status}`);
    logger.debug(`Response data: ${JSON.stringify(response.data, null, 2)}`);

    return Promise.resolve(response.data);
  },

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
      logger.debug(`[ccdCaseService] Response data: ${JSON.stringify(response?.data?.cases, null, 2)}`);
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
        // Return null instead of throwing - the case might have been submitted or the API format might have changed
        return null;
      }
      logger.error(`[ccdCaseService] Unexpected error: ${axiosError.message}`);
      if (axiosError.response?.data) {
        logger.debug(`[ccdCaseService] Error response data: ${JSON.stringify(axiosError.response.data, null, 2)}`);
      }
      throw error;
    }
  },

  async createCase(accessToken: string | undefined, data: UserJourneyCaseData): Promise<CcdCase> {
    const eventUrl = `${getBaseUrl()}/case-types/${getCaseTypeId()}/event-triggers/citizenCreateApplication`;
    const eventToken = await getEventToken(accessToken || '', eventUrl);
    const url = `${getBaseUrl()}/case-types/${getCaseTypeId()}/cases`;
    return submitEvent(accessToken || '', url, 'citizenCreateApplication', eventToken, data);
  },

  async submitEvent(accessToken: string | undefined, eventId: string, ccdCase: CcdCase): Promise<CcdCase> {
    const eventUrl = `${getBaseUrl()}/cases/${ccdCase.id}/event-triggers/${eventId}`;
    const eventToken = await getEventToken(accessToken || '', eventUrl);
    const url = `${getBaseUrl()}/cases/${ccdCase.id}/events`;
    return submitEvent(accessToken || '', url, eventId, eventToken, ccdCase.data);
  },

  async updateCase(accessToken: string | undefined, ccdCase: CcdCase): Promise<CcdCase> {
    if (!ccdCase.id) {
      throw 'Cannot UPDATE Case, CCD Case Not found';
    }

    const eventUrl = `${getBaseUrl()}/cases/${ccdCase.id}/event-triggers/citizenUpdateApplication`;
    const eventToken = await getEventToken(accessToken || '', eventUrl);
    const url = `${getBaseUrl()}/cases/${ccdCase.id}/events`;
    return submitEvent(accessToken || '', url, 'citizenUpdateApplication', eventToken, ccdCase.data);
  },

  async submitCase(accessToken: string | undefined, ccdCase: CcdCase): Promise<CcdCase> {
    if (!ccdCase.id) {
      throw 'Cannot SUBMIT Case, CCD Case Not found';
    }
    const eventUrl = `${getBaseUrl()}/cases/${ccdCase.id}/event-triggers/citizenSubmitApplication`;
    const eventToken = await getEventToken(accessToken || '', eventUrl);
    const url = `${getBaseUrl()}/cases/${ccdCase.id}/events`;
    return submitEvent(accessToken || '', url, 'citizenSubmitApplication', eventToken, ccdCase.data);
  },
};
