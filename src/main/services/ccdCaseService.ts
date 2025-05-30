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


export const ccdCaseService = {
  async getCase(user: UserInfoResponseWithToken | undefined): Promise<CcdCase | null> {
    console.log('getBAseURL ===> ', getBaseUrl());
    console.log('getCase userId => ', user?.uid);

    const url = `${getBaseUrl()}/searchCases?ctid=PCS`;
    const headersConfig = {
      headers: {
        Authorization: `Bearer ${user?.accessToken}`,
         'Content-Type': 'application/json'
      },
    };

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
      throw error;
    }
  },

  async createCase(userId: string): Promise<CcdCase> {
    // TODO: Implement real CCD case creation
    console.log('createCase userId => ', userId);
    return {
      id: 'test',
      data: {
        applicantForename: 'test1',
        applicantSurname: 'test2',
        applicantAddress: {
          AddressLine1: 'test',
          AddressLine2: 'test',
          AddressLine3: 'test',
          PostTown: 'test',
          County: 'test',
          PostCode: 'test',
          Country: 'test',
        }
      },
    };
  }
};
