import { UserInfoResponseWithToken} from '../../types/global';
import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import { http } from '../modules/http';
import { AxiosError } from 'axios';
import { CcdCase, CcdCaseData, CcdUserCases } from '../interfaces/ccdCase.interface';


const logger = Logger.getLogger('ccdCaseService');

function getBaseUrl(): string {
  return config.get('ccd.url');
}

function getCaseHeaders(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      experimental: true,
      Accept: '*/*',
      'Content-Type': 'application/json'
    }
  };
}

async function getEventToken(
  userToken: string,
  url: string
): Promise<string> {
  try {
    console.log('url => ', url);
    const response = await http.get<any>(url, getCaseHeaders(userToken));
    console.log('response => ', response.data);
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
  data: CcdCaseData
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
      console.log('submit event => ', url);
      console.log('submit event payload => ', payload);
      const response = await http.post<CcdCase>(url, payload, getCaseHeaders(userToken));
      console.log('response => ', response.data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error(`[ccdCaseService] Unexpected error: ${axiosError.message}`);
     throw error;
  }
}


export const ccdCaseService = {
  async getCase(user: UserInfoResponseWithToken | undefined): Promise<CcdCase | null> {
    console.log('getBAseURL ===> ', getBaseUrl());

    const url = `${getBaseUrl()}/searchCases?ctid=PCS`;
    const headersConfig = getCaseHeaders(user?.accessToken || '');

    const requestBody = {
      query: { match_all: {} },
      sort: [{ created_date: { order: 'desc' } }]
    };

    logger.info(`[pcsApiService] Calling ccdCaseService search with URL: ${url}`);

    try {
      const response = await http.post<CcdUserCases>(url, requestBody, headersConfig);
      console.log('response.data => ', response.data);
      const cases = response?.data?.cases;
      if(cases && cases.length > 0){
        return {
          id: cases[0].id,
          data: cases[0].case_data
        }
      }
      return null;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        logger.warn('[ccdCaseService] No case found, returning null.');
        return null;
      }
      logger.error(`[ccdCaseService] Unexpected error: ${axiosError.message}`);
      throw error;
    }
  },

  async createCase(user: UserInfoResponseWithToken | undefined, data: CcdCaseData): Promise<CcdCase> {
    const eventUrl =  `${getBaseUrl()}/case-types/PCS/event-triggers/citizenCreateApplication`
    const eventToken = await getEventToken(user?.accessToken || '', eventUrl);
    const url = `${getBaseUrl()}/case-types/PCS/cases`;
    return submitEvent(user?.accessToken || '', url, 'citizenCreateApplication', eventToken, data);
  },

  async updateCase(user: UserInfoResponseWithToken | undefined, ccdCase: CcdCase): Promise<CcdCase> {
    console.log('ccdCAse ==> ', ccdCase);
     if(!ccdCase.id){
      throw 'Cannot UPDATE Case, CCDCase Not found';
    }

    const eventUrl =  `${getBaseUrl()}/cases/${ccdCase.id}/event-triggers/citizenUpdateApplication`
    const eventToken = await getEventToken(user?.accessToken || '', eventUrl);
    const url = `${getBaseUrl()}/cases/${ccdCase.id}/events`;
    return submitEvent(user?.accessToken || '', url, 'citizenUpdateApplication', eventToken, ccdCase.data);
  },

  async submitCase(user: UserInfoResponseWithToken | undefined, ccdCase: CcdCase): Promise<CcdCase> {
    console.log('submitCase ccdCAse ==> ', ccdCase);
    if(!ccdCase.id){
      throw 'Cannot SUBMIT Case, CCDCase Not found';
    }
    const eventUrl =  `${getBaseUrl()}/cases/${ccdCase.id}/event-triggers/citizenSubmitApplication`
    const eventToken = await getEventToken(user?.accessToken || '', eventUrl);
    const url = `${getBaseUrl()}/cases/${ccdCase.id}/events`;
    return submitEvent(user?.accessToken || '', url, 'citizenSubmitApplication', eventToken, ccdCase.data);
  }
};
