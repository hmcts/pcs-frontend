import { Logger } from '@hmcts/nodejs-logging';
import axios, { AxiosError } from 'axios';
import config from 'config';
import { randomUUID } from 'node:crypto';
import { TOTP } from 'totp-generator';

import { CaseState, CcdCase, CcdUserCases, UserJourneyCaseData } from '../interfaces/ccdCase.interface';
import { http } from '../modules/http';

const logger = Logger.getLogger('ccdCaseService');

interface EventTokenResponse {
  token: string;
}

const hasConfig = (key: string): boolean => typeof (config as { has?: (key: string) => boolean }).has === 'function' && config.has(key);

function getBaseUrl(): string {
  return config.get('ccd.url');
}

function getPersistenceBaseUrl(): string {
  if (hasConfig('ccd.persistenceUrl')) {
    return config.get('ccd.persistenceUrl');
  }
  if (hasConfig('persistence.url')) {
    return config.get('persistence.url');
  }
  if (hasConfig('api.url')) {
    return config.get('api.url');
  }
  return getBaseUrl();
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

async function getServiceAuthToken(): Promise<string | null> {
  const has = (key: string): boolean => typeof (config as { has?: (key: string) => boolean }).has === 'function' && config.has(key);
  const secretKey = has('secrets.pcs.pcs-frontend-s2s-secret')
    ? (config.get('secrets.pcs.pcs-frontend-s2s-secret') as string)
    : '';
  const s2sUrl = has('s2s.url') ? (config.get('s2s.url') as string) : '';

  if (!secretKey || !s2sUrl) {
    logger.warn('[ccdCaseService] S2S secret or URL missing; skipping ServiceAuthorization header');
    return null;
  }

  try {
    const { otp } = TOTP.generate(secretKey);
    const response = await axios.post(
      `${s2sUrl}/lease`,
      { microservice: 'pcs_frontend', oneTimePassword: otp },
      {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true,
      }
    );
    if (response.status >= 200 && response.status < 300 && typeof response.data === 'string') {
      return response.data;
    }
    logger.warn(
      `[ccdCaseService] Failed to obtain S2S token. Status: ${response.status}, Body: ${JSON.stringify(response.data)}`
    );
    return null;
  } catch (error) {
    logger.error(`[ccdCaseService] Error fetching S2S token: ${(error as Error).message}`);
    return null;
  }
}

async function getEventToken(userToken: string, url: string): Promise<string> {
  try {
    logger.info(`[ccdCaseService] Calling getEventToken with URL: ${url}`);
    const response = await http.get<EventTokenResponse>(url, getCaseHeaders(userToken));
    logger.info(`[ccdCaseService] Response data: ${JSON.stringify(response.data, null, 2)}`);
    return response.data.token;
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.error(`[ccdCaseService] Unexpected error: ${axiosError.message}`);
    throw error;
  }
}

function getDefaultAccessToken(): string | undefined {
  const envToken = process.env.PCS_IDAM_TOKEN || process.env.IDAM_ACCESS_TOKEN;
  if (envToken) {
    logger.info('[ccdCaseService] Using PCS_IDAM_TOKEN/IDAM_ACCESS_TOKEN from env');
    return envToken;
  }
  if (hasConfig('secrets.pcs.pcs-judge-token')) {
    logger.info('[ccdCaseService] Using pcs-judge-token from config');
    return config.get('secrets.pcs.pcs-judge-token') as string;
  }
  if (hasConfig('secrets.pcs.dev-access-token')) {
    logger.info('[ccdCaseService] Using dev-access-token from config');
    return config.get('secrets.pcs.dev-access-token') as string;
  }
   logger.warn('[ccdCaseService] No default access token found; falling back to dev-access-token');
  return undefined;
}

interface PersistedCaseDetails {
  id?: string | number;
  reference?: string | number;
  state?: string;
  version?: number;
  jurisdiction?: string;
  case_type_id?: string;
  caseTypeId?: string;
  security_classification?: string;
  securityClassification?: string;
}

async function fetchPersistedCase(
  caseReference: string,
  headers: Record<string, string | undefined>
): Promise<PersistedCaseDetails | null> {
  const queryUrl = `${getPersistenceBaseUrl()}/ccd-persistence/cases?case-refs=${caseReference}`;
  try {
    const response = await axios.get(queryUrl, {
      headers,
      validateStatus: () => true,
    });
    if (response.status >= 400) {
      logger.warn(
        `[ccdCaseService] Failed to fetch persisted case ${caseReference}. Status: ${response.status}, Body: ${JSON.stringify(response.data)}`
      );
      return null;
    }

    const raw = Array.isArray(response.data) ? response.data[0] : response.data;
    if (!raw) {
      return null;
    }

    // API returns snake_case by default; guard for either.
    const caseDetails = raw.case_details || raw.caseDetails || raw;
    return caseDetails as PersistedCaseDetails;
  } catch (error) {
    logger.error(`[ccdCaseService] Error fetching persisted case ${caseReference}: ${(error as Error).message}`);
    return null;
  }
}

const toYesNo = (value: unknown): 'Yes' | 'No' | undefined => {
  if (value === true) {
    return 'Yes';
  }
  if (value === false) {
    return 'No';
  }
  return undefined;
};

async function submitEvent(
  userToken: string,
  url: string,
  eventId: string,
  eventToken: string,
  data: UserJourneyCaseData,
  summary?: string,
  description?: string
): Promise<CcdCase> {
  const payload = {
    data,
    event: {
      id: eventId,
      summary: summary ?? `Citizen ${eventId} summary`,
      description: description ?? `Citizen ${eventId} description`,
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
    const axiosError = error as AxiosError;
    logger.error(`[ccdCaseService] Unexpected error: ${axiosError.message}`);
    throw error;
  }
}

export const ccdCaseService = {
  async getEventTokenForEvent(accessToken: string | undefined, caseId: string, eventId: string): Promise<string> {
    const eventUrl = `${getBaseUrl()}/cases/${caseId}/event-triggers/${eventId}`;
    return getEventToken(accessToken || '', eventUrl);
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
          `[ccdCaseService] Bad request (400) when searching for cases. Response: ${JSON.stringify(axiosError.response?.data, null, 2)}`
        );
        // Return null instead of throwing - the case might have been submitted or the API format might have changed
        return null;
      }
      logger.error(`[ccdCaseService] Unexpected error: ${axiosError.message}`);
      if (axiosError.response?.data) {
        logger.error(`[ccdCaseService] Error response data: ${JSON.stringify(axiosError.response.data, null, 2)}`);
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

  async createOrder(caseId: string, data: UserJourneyCaseData, accessToken?: string): Promise<unknown> {
    const caseReference = caseId.replace(/\D/g, '');
    if (!caseReference) {
      throw new Error('A numeric case reference is required to submit an order');
    }

    const url = `${getPersistenceBaseUrl()}/ccd-persistence/cases`;
    const s2sToken = await getServiceAuthToken();
    const headers = {
      Authorization: `Bearer ${accessToken || getDefaultAccessToken() || 'dev-access-token'}`,
      ServiceAuthorization: s2sToken ? `Bearer ${s2sToken}` : undefined,
      'Idempotency-Key': randomUUID(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const persisted = await fetchPersistedCase(caseReference, headers);
    const internalCaseId = 1; // For PCS demo: internal DB id for the seeded case reference
    const persistedState = persisted?.state || 'PENDING_CASE_ISSUED';
    const persistedVersion = persisted?.version;

    const ordersPayload = data.ordersDemoPayload
      ? {
          ...data.ordersDemoPayload,
          previewWasEdited: toYesNo(data.ordersDemoPayload.previewWasEdited),
          orderDetails: data.ordersDemoPayload.orderDetails
            ? {
                ...data.ordersDemoPayload.orderDetails,
                suspended: data.ordersDemoPayload.orderDetails.suspended
                  ? {
                      ...data.ordersDemoPayload.orderDetails.suspended,
                      arrears: data.ordersDemoPayload.orderDetails.suspended.arrears
                        ? {
                            ...data.ordersDemoPayload.orderDetails.suspended.arrears,
                            enabled: toYesNo(data.ordersDemoPayload.orderDetails.suspended.arrears.enabled),
                          }
                        : undefined,
                      initialPayment: data.ordersDemoPayload.orderDetails.suspended.initialPayment
                        ? {
                            ...data.ordersDemoPayload.orderDetails.suspended.initialPayment,
                            enabled: toYesNo(data.ordersDemoPayload.orderDetails.suspended.initialPayment.enabled),
                          }
                        : undefined,
                      instalments: data.ordersDemoPayload.orderDetails.suspended.instalments
                        ? {
                            ...data.ordersDemoPayload.orderDetails.suspended.instalments,
                            enabled: toYesNo(data.ordersDemoPayload.orderDetails.suspended.instalments.enabled),
                          }
                        : undefined,
                    }
                  : undefined,
              }
            : undefined,
          costs: data.ordersDemoPayload.costs
            ? {
                ...data.ordersDemoPayload.costs,
                addToDebt: toYesNo(data.ordersDemoPayload.costs.addToDebt),
              }
            : undefined,
        }
      : undefined;

    const payload = {
      case_details: {
        id: caseReference,
        jurisdiction: hasConfig('ccd.jurisdiction') ? config.get('ccd.jurisdiction') : 'PCS',
        case_type_id: getCaseTypeId(),
        state: persistedState,
        version: persistedVersion,
        security_classification: 'PUBLIC',
        case_data: {
          ...data,
          ...(ordersPayload ? { ordersDemoPayload: ordersPayload } : {}),
        },
      },
      event_details: {
        case_type: getCaseTypeId(),
        event_id: 'ordersDemoSubmit',
        event_name: 'Orders demo submit',
        description: 'Order created from demo UI',
        summary: 'Orders demo submit',
      },
    };

    try {
      logger.info(`[ccdCaseService] Calling decentralised submitEvent with URL: ${url}`);
      logger.info(
        `[ccdCaseService] Payload: ${JSON.stringify(
          { ...payload, internal_case_id: internalCaseId },
          null,
          2
        )}`
      );
      logger.info(
        `[ccdCaseService] Headers: ${JSON.stringify({
          Authorization: headers.Authorization ? `${headers.Authorization.slice(0, 20)}...` : null,
          ServiceAuthorization: headers.ServiceAuthorization ? 'set' : 'missing',
        })}`
      );
      const response = await axios.post(
        url,
        { ...payload, internal_case_id: internalCaseId },
        {
          headers,
          validateStatus: () => true,
        }
      );
      logger.info(`[ccdCaseService] Response data: ${JSON.stringify(response.data, null, 2)}`);
      if (response.status >= 400) {
        throw new Error(`Decentralised submitEvent failed with status ${response.status}`);
      }
      return response.data as unknown;
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error(`[ccdCaseService] Unexpected error: ${axiosError.message}`);
      throw error;
    }
  },
};
