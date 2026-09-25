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
import { AxiosError } from 'axios';
import config from 'config';

import { ClientContextHeaders } from '../../types/global';
import { HTTPError } from '../HttpError';

import { http } from '@modules/http';
import { Logger } from '@modules/logger';
import { MakeAnApplicationResponse } from '@services/ccdCase.interface';
import type { CcdCase, CcdCaseData, StartCallbackData } from '@services/ccdCase.interface';
import type {
  DashboardNotification,
  DashboardRelatedApplication,
  DashboardTaskGroup,
} from '@services/dashboard.interface';
import { sanitiseCaseReference } from '@utils/caseReference';
import {
  formatAddress,
  unwrapNotifications,
  unwrapRelatedApplications,
  unwrapTaskGroups,
} from '@utils/ccdDashboardUtils';

const logger = Logger.getLogger('ccdCaseService');

interface EventTokenResponse {
  token: string;
}

export interface TransformedDashboardData {
  notifications: DashboardNotification[];
  taskGroups: DashboardTaskGroup[];
  propertyAddress: string | undefined;
  relatedApplications: DashboardRelatedApplication[];
}

function getBaseUrl(): string {
  return config.get('ccd.url');
}

function getCaseTypeId(): string {
  return config.get('ccd.caseTypeId');
}

export type CaseHeaders = {
  headers: {
    Authorization: string;
    experimental: boolean;
    Accept: string;
    'Content-Type': string;
    'Client-Context'?: string;
  };
};

function getCaseHeaders(token: string): CaseHeaders {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      experimental: true,
      Accept: '*/*',
      'Content-Type': 'application/json',
    },
  };
}

interface CcdErrorResponseData {
  callbackErrors?: string[];
  callbackWarnings?: string[];
  exception?: string;
  message?: string;
}

function isAccessDeniedCallbackFailure(
  status: number | undefined,
  responseData: CcdErrorResponseData | undefined
): boolean {
  if (status !== 502 || !responseData) {
    return false;
  }

  const exception = responseData.exception ?? '';
  const message = responseData.message ?? '';

  return (
    exception.includes('CallbackException') &&
    message.includes('Callback to service has been unsuccessful') &&
    message.includes('about-to-start')
  );
}

function convertAxiosErrorToHttpError(error: unknown, context: string): HTTPError {
  // HttpService throws HTTPError(401) directly for user-token 401s - propagate as-is
  if (error instanceof HTTPError) {
    return error;
  }

  const axiosError = error as AxiosError;
  const status = axiosError.response?.status;
  const responseData = axiosError.response?.data as CcdErrorResponseData | undefined;

  logger.error(`Error in ${context}: ${axiosError.message}`);
  if (responseData) {
    logger.error(`Error response data: ${JSON.stringify(responseData, null, 2)}`);
  }

  if (status === 403) {
    return new HTTPError('Not authorised to access CCD case service', 403);
  }

  if (isAccessDeniedCallbackFailure(status, responseData)) {
    return new HTTPError('Access denied', 403);
  }

  const callbackMessages = [...(responseData?.callbackErrors ?? []), ...(responseData?.callbackWarnings ?? [])];
  if (callbackMessages.length > 0) {
    return new HTTPError(`CCD callback rejected request: ${callbackMessages.join('; ')}`, status || 422);
  }

  const retryAfterHeader = axiosError.response?.headers?.['retry-after'];
  const retryAfter =
    status && [502, 503, 504, 429].includes(status) && typeof retryAfterHeader === 'string'
      ? retryAfterHeader
      : undefined;

  return new HTTPError(`CCD case service error: ${axiosError.message || 'Unknown error'}`, status || 500, retryAfter);
}

// Read endpoints coerce 400/404 to a 403 so the client sees an access-denied page
// rather than leaking case existence (404 -> pageNotFound) or a bad-request.
function convertReadErrorToHttpError(error: unknown, context: string): HTTPError {
  const httpError = convertAxiosErrorToHttpError(error, context);
  if (httpError.status === 400 || httpError.status === 404) {
    return new HTTPError('Access denied', 403);
  }
  return httpError;
}

/**
 * Get event token from CCD
 *
 * This is the first phase of the CCD event lifecycle.
 * CCD validates permissions and returns a one-time event token.
 *
 * Note: The response also includes current case data, but we don't use it
 * because the SUBMIT phase returns the authoritative merged data.
 *
 * @param userToken - User's OIDC access token
 * @param caseId - CCD case reference
 * @param eventId - CCD event ID
 * @returns Event token for SUBMIT phase
 */
async function getEventToken(userToken: string, caseId: string, eventId: string): Promise<string> {
  const eventTriggerUrl = `${getBaseUrl()}/cases/${caseId}/event-triggers/${eventId}`;

  try {
    logger.debug(`Calling getEventToken with URL: ${eventTriggerUrl}`);
    const response = await http.get<EventTokenResponse>(eventTriggerUrl, getCaseHeaders(userToken));
    return response.data.token;
  } catch (error) {
    throw convertAxiosErrorToHttpError(error, 'getEventToken');
  }
}

/**
 * Submit an event to CCD
 *
 * @param userToken - User's OIDC access token
 * @param eventId - CCD event identifier (e.g., 'respondPossessionClaim')
 * @param ccdCase - The event data in the CCD case model
 * @returns Merged case data from CCD (authoritative source of truth)
 */
async function submitEvent(userToken: string | undefined, eventId: string, ccdCase: CcdCase): Promise<CcdCase> {
  if (!userToken) {
    throw new HTTPError('No user token provided', 401);
  }

  const caseId = ccdCase.id;
  if (!caseId) {
    throw new HTTPError('Case ID not provided', 500);
  }

  const eventToken = await getEventToken(userToken, caseId, eventId);
  const payload = buildEventPayload(ccdCase, eventId, eventToken);
  const eventSubmitUrl = `${getBaseUrl()}/cases/${caseId}/events`;

  try {
    logger.info(`Submitting event ${eventId} for case ${caseId}`);
    const response = await http.post<CcdCase>(eventSubmitUrl, payload, getCaseHeaders(userToken));
    return response.data;
  } catch (error) {
    throw convertAxiosErrorToHttpError(error, 'submitEvent');
  }
}

function buildEventPayload(ccdCase: CcdCase, eventId: string, eventToken: string) {
  return {
    data: ccdCase.data as Record<string, unknown>,
    event: {
      id: eventId,
      summary: `Citizen ${eventId} summary`,
      description: `Citizen ${eventId} description`,
    },
    event_token: eventToken,
    ignore_warning: false,
  };
}

export const ccdCaseService = {
  async getCaseByIdForEvent(
    accessToken: string,
    caseId: string,
    eventId: string = 'respondPossessionClaim',
    clientContextHeaders?: ClientContextHeaders
  ): Promise<CcdCase> {
    const safeCaseId = sanitiseCaseReference(caseId);
    if (!safeCaseId) {
      throw new HTTPError('Invalid case reference format', 404);
    }

    const eventUrl = `${getBaseUrl()}/cases/${safeCaseId}/event-triggers/${eventId}?ignore-warning=false`;

    try {
      logger.info(`Validating case access for caseId: ${safeCaseId}, eventId: ${eventId}`);
      const caseHeaders: CaseHeaders = getCaseHeaders(accessToken);

      if (clientContextHeaders) {
        caseHeaders.headers['Client-Context'] = JSON.stringify(clientContextHeaders);
      }

      const response = await http.get<StartCallbackData>(eventUrl, caseHeaders);
      logger.info(`Case access validated successfully for caseId: ${safeCaseId}`);

      const caseData: CcdCaseData = response.data.case_details?.case_data ?? {};

      return {
        id: safeCaseId,
        data: caseData,
      };
    } catch (error) {
      throw convertReadErrorToHttpError(error, 'getCaseByIdForEvent');
    }
  },

  async getCaseById(accessToken: string, caseId: string): Promise<CcdCase> {
    const safeCaseId = sanitiseCaseReference(caseId);
    if (!safeCaseId) {
      throw new HTTPError('Invalid case reference format', 404);
    }

    const caseUrl = `${getBaseUrl()}/cases/${safeCaseId}`;

    try {
      logger.debug(`Fetching case by id for read view: ${safeCaseId}`);
      const response = await http.get<CcdCase>(caseUrl, getCaseHeaders(accessToken));
      logger.debug(`Read case response for ${safeCaseId}: ${JSON.stringify(response.data, null, 2)}`);
      const caseData = response.data.data ?? {};

      return {
        id: String(response.data.id ?? safeCaseId),
        data: caseData,
      };
    } catch (error) {
      throw convertReadErrorToHttpError(error, 'getCaseById');
    }
  },

  async submitResponseToClaim(accessToken: string | undefined, ccdCase: CcdCase): Promise<CcdCase> {
    const eventId = 'respondPossessionClaim';
    return submitEvent(accessToken, eventId, ccdCase);
  },

  async submitGeneralApplication(
    accessToken: string | undefined,
    ccdCase: CcdCase
  ): Promise<MakeAnApplicationResponse> {
    const eventId = 'makeAnApplication';
    return submitEvent(accessToken, eventId, ccdCase).then(responseData => {
      const confirmationBodyJson = responseData.after_submit_callback_response?.confirmation_body;
      if (confirmationBodyJson) {
        return JSON.parse(confirmationBodyJson) as MakeAnApplicationResponse;
      } else {
        throw new HTTPError('No confirmation body found in response data', 500);
      }
    });
  },

  async submitUploadDocuments(accessToken: string | undefined, ccdCase: CcdCase): Promise<CcdCase> {
    const eventId = 'uploadDocuments';
    return submitEvent(accessToken, eventId, ccdCase);
  },

  async getExistingCaseData(
    accessToken: string | undefined,
    ccdCaseId: string,
    clientContextHeaders?: ClientContextHeaders
  ): Promise<StartCallbackData> {
    const eventUrl = `${getBaseUrl()}/cases/${ccdCaseId}/event-triggers/respondPossessionClaim?ignore-warning=false`;
    logger.info('getExistingCaseData event URL', { eventUrl });

    const caseHeaders: CaseHeaders = getCaseHeaders(accessToken || '');
    if (clientContextHeaders) {
      caseHeaders.headers['Client-Context'] = JSON.stringify(clientContextHeaders);
    }

    try {
      const response = await http.get<StartCallbackData>(eventUrl, caseHeaders);
      return response.data;
    } catch (error) {
      throw convertReadErrorToHttpError(error, 'getExistingCaseDataError');
    }
  },

  async updateDraft(
    draftEvent: { id: string; pageId: string },
    accessToken: string | undefined,
    caseId: string,
    data: Record<string, unknown>,
    clientContextHeaders?: ClientContextHeaders
  ): Promise<CcdCase> {
    if (!caseId) {
      throw new HTTPError('Cannot UPDATE draft, Case Id not specified', 500);
    }

    const ccdPageId = `${draftEvent.id}${draftEvent.pageId}`;
    const url = `${getBaseUrl()}/case-types/${getCaseTypeId()}/validate?pageId=${ccdPageId}`;

    const payload = {
      event: {
        id: draftEvent.id,
        summary: `Citizen ${draftEvent.id} draft save summary`,
        description: `Citizen ${draftEvent.id} draft save description`,
      },
      case_reference: caseId,
      event_data: data,
      ignore_warning: false,
    };

    const caseHeaders: CaseHeaders = getCaseHeaders(accessToken || '');

    if (clientContextHeaders) {
      caseHeaders.headers['Client-Context'] = JSON.stringify(clientContextHeaders);
    }

    try {
      const response = await http.post<{ data: CcdCaseData }>(url, payload, caseHeaders);
      return {
        id: caseId,
        data: response.data?.data ?? {},
      };
    } catch (error) {
      throw convertAxiosErrorToHttpError(error, `save draft ${draftEvent.id}`);
    }
  },

  async getDashboardView(accessToken: string, caseId: string): Promise<TransformedDashboardData> {
    const eventUrl = `${getBaseUrl()}/cases/${caseId}/event-triggers/dashboardView?ignore-warning=false`;
    try {
      const response = await http.get<StartCallbackData>(eventUrl, getCaseHeaders(accessToken));
      const raw = response.data.case_details?.case_data?.dashboardData ?? {};

      const notifications = unwrapNotifications(raw.notifications);
      const taskGroups = unwrapTaskGroups(raw.taskGroups);
      const relatedApplications = unwrapRelatedApplications(raw.relatedApplications);

      return { notifications, taskGroups, propertyAddress: formatAddress(raw.propertyAddress), relatedApplications };
    } catch (error) {
      throw convertReadErrorToHttpError(error, 'getDashboardView');
    }
  },
};
