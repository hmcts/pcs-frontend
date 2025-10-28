import { Logger } from '@hmcts/nodejs-logging';
import { AxiosError } from 'axios';
import config from 'config';

import { CaseState, CcdCase, CcdCaseData, CcdUserCases } from '../interfaces/ccdCase.interface';
import { http } from '../modules/http';
import { sanitizeCaseId, validateCaseId } from '../utils/caseIdValidator';

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
    const response = await http.get<EventTokenResponse>(url, getCaseHeaders(userToken));
    return response.data.token;
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error(`[ccdCaseService] Event token error: ${axiosError.message}`);
    throw error;
  }
}

async function submitEvent(
  userToken: string,
  url: string,
  eventId: string,
  eventToken: string,
  data: CcdCaseData
): Promise<CcdCase> {
  const payload = {
    event: {
      id: eventId,
    },
    data,
    event_token: eventToken,
  };

  try {
    logger.info('[CCD] Payload:', JSON.stringify(payload, null, 2));
    const response = await http.post<CcdCase>(url, payload, getCaseHeaders(userToken));
    logger.info('[CCD] Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error(`[CCD] Error: ${axiosError.message}`);
    throw error;
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

    try {
      const response = await http.post<CcdUserCases>(url, requestBody, headersConfig);
      const allCases = response?.data?.cases;
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
        return null;
      }
      logger.error(`[CCD] Get case error: ${axiosError.message}`);
      throw error;
    }
  },

  async createCase(accessToken: string | undefined, data: CcdCaseData): Promise<CcdCase> {
    const eventUrl = `${getBaseUrl()}/case-types/${getCaseTypeId()}/event-triggers/citizenCreateApplication`;
    const eventToken = await getEventToken(accessToken || '', eventUrl);
    const url = `${getBaseUrl()}/case-types/${getCaseTypeId()}/cases`;
    return submitEvent(accessToken || '', url, 'citizenCreateApplication', eventToken, data);
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

  async updateCaseDocuments(
    accessToken: string,
    caseId: string,
    documents: {
      id: string;
      value: {
        documentType: string;
        document: {
          document_url: string;
          document_filename: string;
          document_binary_url: string;
        };
        description: string | null;
      };
    }[]
  ): Promise<CcdCase> {
    // Validate case ID to prevent SSRF attacks
    if (!validateCaseId(caseId)) {
      throw new Error('Invalid case ID format');
    }

    const sanitizedCaseId = sanitizeCaseId(caseId);

    // Get event token
    const eventUrl = `${getBaseUrl()}/cases/${sanitizedCaseId}/event-triggers/citizenUpdateApplication`;
    const eventToken = await getEventToken(accessToken, eventUrl);

    // Prepare data with documents
    const caseData: CcdCaseData = {
      citizenDocuments: documents,
    };

    // Submit to CCD
    const url = `${getBaseUrl()}/cases/${sanitizedCaseId}/events`;
    return submitEvent(accessToken, url, 'citizenUpdateApplication', eventToken, caseData);
  },
};
