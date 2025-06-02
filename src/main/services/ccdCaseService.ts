import { UserInfoResponseWithToken} from '../../types/global';
import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import { http } from '../modules/http';
import { AxiosError } from 'axios';
import { CcdCase, CcdUserCases } from '../interfaces/ccdCase.interface';


const logger = Logger.getLogger('ccdCaseService');

function getBaseUrl(): string {
  return config.get('ccd.url');
}

function getCaseHeaders(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      experimental: 'true',
      Accept: '*/*',
      'Content-Type': 'application/json'
    }
  };
}

async function getEventToken(
  userToken: string,
  eventId: string
): Promise<string> {
  try {
    const url = `${getBaseUrl()}/case-types/PCS/event-triggers/${eventId}`;
    const response = await http.get<any>(url, getCaseHeaders(userToken));
    console.log('response => ', response);
    return response.data.token;
  } catch (error) {
    const axiosError = error as AxiosError;

    logger.error(`[ccdCaseService] Unexpected error: ${axiosError.message}`);
    return 'event token';
    // throw error;
  }
}

async function submitEvent(
  userToken: string,
  url: string,
  eventId: string,
  eventToken: string,
  data: any
): Promise<CcdCase> {
  const payload = {
    data,
    event: {
      id: eventId,
      summary: `Citizen ${eventId} summary`,
      description: `Citizen ${eventId} description`
    },
    event_token: eventToken,
    ignore_warning: false
  };

   try {
      const response = await http.post<CcdCase>(url, payload, getCaseHeaders(userToken));
      console.log('response => ', response);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error(`[ccdCaseService] Unexpected error: ${axiosError.message}`);
      return {
        id: 'id',
        data
      }
    // throw error;
  }
}


export const ccdCaseService = {
  async getCase(user: UserInfoResponseWithToken | undefined): Promise<CcdCase | null> {
    console.log('getBAseURL ===> ', getBaseUrl());
    console.log('getCase userId => ', user?.uid);

    const url = `${getBaseUrl()}/searchCases?ctid=PCS`;
    const headersConfig = getCaseHeaders(user?.accessToken || '');

    const requestBody = {
      query: { match_all: {} },
      sort: [{ created_date: { order: 'desc' } }]
    };

    logger.info(`[pcsApiService] Calling ccdCaseService search with URL: ${url}`);

    try {
      const response = await http.post<CcdUserCases>(url, requestBody, headersConfig);
      const cases = response?.data?.cases;
      return cases && cases.length > 0 ? cases[0] : null;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 404) {
        logger.warn('[ccdCaseService] No case found, returning null.');
        return null;
      }

      logger.error(`[ccdCaseService] Unexpected error: ${axiosError.message}`);
      return null;
     // throw error;
    }
  },

  async createCase(user: UserInfoResponseWithToken | undefined): Promise<CcdCase> {
    const eventToken = await getEventToken(user?.accessToken || '', 'citizenCreateApplication');
    const url = `${getBaseUrl()}/case-types/PCS/cases`;

    const data =  {
      id: 'id',
      data:{
        applicantForename: '',
        applicantSurname: '',
        applicantAddress: {
          AddressLine1: '',
          AddressLine2: '',
          AddressLine3: '',
          PostTown: '',
          County: '',
          PostCode: '',
          Country: ''
        }
      }
    }

    return submitEvent(user?.accessToken || '', url, 'citizenCreateApplication', eventToken, data);
  },

  async updateCase(user: UserInfoResponseWithToken | undefined, ccdCase: CcdCase): Promise<CcdCase> {
    const eventToken = await getEventToken(user?.accessToken || '', 'citizenUpdateApplication');
    const url = `${getBaseUrl()}/cases/${ccdCase.id}/events`;
    return submitEvent(user?.accessToken || '', url, 'citizenUpdateApplication', eventToken, ccdCase.data);
  }
};
