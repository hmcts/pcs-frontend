/**
 * CCD Case Service
 *
 * This service manages interactions with the CCD (Case and Case Data) backend.
 *
 * CCD Event Lifecycle Pattern: START → SUBMIT
 * ============================================
 *
 * All CCD case modifications follow a two-phase pattern:
 *
 * 1. START Phase: Request permission to modify the case
 *    - Endpoint: GET /cases/{id}/event-triggers/{eventId}
 *    - Returns: Event token (required for security) + current case data
 *    - Purpose: CCD validates user permissions and generates a one-time token
 *
 * 2. SUBMIT Phase: Submit changes to the case
 *    - Endpoint: POST /cases/{id}/events
 *    - Requires: Event token from START phase
 *    - Sends: Incremental changes only (e.g., just firstName/lastName)
 *    - Returns: Merged case data (CCD deep-merges our changes with existing data)
 *
 * Why Both Calls Are Necessary:
 * - START is mandatory for CCD security/validation (cannot be skipped)
 * - SUBMIT response contains authoritative merged data from backend
 * - Backend performs deep merge: existing data + our changes = merged result
 * - Cannot predict merge result client-side (backend may add timestamps, IDs, etc.)
 *
 * Example Flow:
 * 1. START returns: { token: "abc123", case_data: { firstName: "John", lastName: "Doe" } }
 * 2. We submit: { firstName: "Jane" }
 * 3. SUBMIT returns: { firstName: "Jane", lastName: "Doe" } ← Backend merged
 */
import { Logger } from '@hmcts/nodejs-logging';
import { AxiosError } from 'axios';
import config from 'config';

import { HTTPError } from '../HttpError';
import { CaseState } from '../interfaces/ccdCase.interface';
import type { CcdCase, CcdUserCases, StartCallbackData } from '../interfaces/ccdCase.interface';
import { http } from '../modules/http';

const logger = Logger.getLogger('ccdCaseService');

interface EventTokenResponse {
  token: string;
}

function getBaseUrl(): string {
  return config.get('ccd.url');
}

function getApiUrl(): string {
  return config.get('api.url');
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

  logger.error(`Error in ${context}: ${axiosError.message}`);
  if (axiosError.response?.data) {
    logger.error(`Error response data: ${JSON.stringify(axiosError.response.data, null, 2)}`);
  }

  if (status === 401 || status === 403) {
    return new HTTPError('Not authorised to access CCD case service', 403);
  }

  return new HTTPError(`CCD case service error: ${axiosError.message || 'Unknown error'}`, 500);
}

/**
 * START Phase: Get event token from CCD
 *
 * This is the first phase of the CCD event lifecycle.
 * CCD validates permissions and returns a one-time event token.
 *
 * Note: The response also includes current case data, but we don't use it
 * because the SUBMIT phase returns the authoritative merged data.
 *
 * @param userToken - User's OIDC access token
 * @param url - CCD event trigger URL
 * @returns Event token for SUBMIT phase
 */
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

/**
 * SUBMIT Phase: Submit changes to CCD
 *
 * This is the second phase of the CCD event lifecycle.
 * Submits incremental changes (only modified fields) and receives merged result.
 *
 * CCD performs deep merge server-side:
 * - Existing case data + our incremental changes = merged result
 * - Only send changed fields (e.g., just firstName/lastName, not entire case)
 * - Backend preserves all other fields unchanged
 *
 * @param userToken - User's OIDC access token
 * @param url - CCD events URL
 * @param eventId - CCD event identifier (e.g., 'respondPossessionClaim')
 * @param eventToken - One-time token from START phase
 * @param data - Incremental changes only (not full case data)
 * @returns Merged case data from CCD (authoritative source of truth)
 */
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
  async getCaseById(accessToken: string, caseId: string, eventId: string = 'respondPossessionClaim'): Promise<CcdCase> {
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

  /**
   * Create a new case in CCD
   *
   * Follows CCD's two-phase START → SUBMIT pattern.
   *
   * @param accessToken - User's OIDC access token
   * @param data - Initial case data
   * @returns Created case with merged data from CCD
   */
  async createCase(accessToken: string | undefined, data: Record<string, unknown>): Promise<CcdCase> {
    // Phase 1: START - Get event token
    const eventUrl = `${getBaseUrl()}/case-types/${getCaseTypeId()}/event-triggers/citizenCreateApplication`;
    const eventToken = await getEventToken(accessToken || '', eventUrl);

    // Phase 2: SUBMIT - Create case and receive result
    const url = `${getBaseUrl()}/case-types/${getCaseTypeId()}/cases`;
    return submitEvent(accessToken || '', url, 'citizenCreateApplication', eventToken, data);
  },

  /**
   * Submit a case to CCD (finalize draft)
   *
   * Follows CCD's two-phase START → SUBMIT pattern.
   * Transitions case from DRAFT to SUBMITTED state.
   *
   * @param accessToken - User's OIDC access token
   * @param ccdCase - Case to submit
   * @returns Submitted case data from CCD
   */
  async submitCase(accessToken: string | undefined, ccdCase: CcdCase): Promise<CcdCase> {
    if (!ccdCase.id) {
      throw new HTTPError('Cannot SUBMIT Case, CCD Case Not found', 500);
    }

    // Phase 1: START - Get event token
    const eventUrl = `${getBaseUrl()}/cases/${ccdCase.id}/event-triggers/citizenSubmitApplication`;
    const eventToken = await getEventToken(accessToken || '', eventUrl);

    // Phase 2: SUBMIT - Finalize case submission
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
    logger.info('getExistingCaseData event URL', { eventUrl });
    try {
      const response = await http.get<StartCallbackData>(eventUrl, getCaseHeaders(accessToken || ''));
      return response.data;
    } catch (error) {
      throw convertAxiosErrorToHttpError(error, 'getExistingCaseDataError');
    }
  },

  async updateDraftRespondToClaim(
    accessToken: string | undefined,
    caseId: string,
    data: Record<string, unknown>
  ): Promise<CcdCase> {
    if (!caseId) {
      throw new HTTPError('Cannot UPDATE draft, CCD Case Not found', 500);
    }

    const url = `${getApiUrl()}/callbacks/mid-event?page=respondToPossessionDraftSavePage`;

    const payload = {
      event_id: 'respondPossessionClaim',
      case_details: {
        id: caseId,
        case_type_id: getCaseTypeId(),
        data,
      },
    };

    try {
      logger.info(`Calling Draft save event with URL: ${url}`);
      logger.info(`Payload: ${JSON.stringify(payload, null, 2)}`);
      const response = await http.post<CcdCase>(url, payload, getCaseHeaders(accessToken || ''));
      logger.info(`Response data: ${JSON.stringify(response.data, null, 2)}`);
      return response.data;
    } catch (error) {
      throw convertAxiosErrorToHttpError(error, 'save draft response to claim');
    }
  },
};
