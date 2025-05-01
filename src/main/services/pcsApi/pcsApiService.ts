import { Logger } from '@hmcts/nodejs-logging';
import axios from 'axios';
import config from 'config';

import type { CourtVenue } from '../../interface/courtVenue.interface';

import { DashboardNotification } from './dashboardNotification.interface';
const logger = Logger.getLogger('pcsApiService');

function getBaseUrl(): string {
  return config.get('api.url');
}

export const getRootGreeting = async (): Promise<string> => {
  const pcsApiURL = getBaseUrl();
  const response = await axios.get(pcsApiURL);
  return response.data;
};

export const getCourtVenues = async (postcode: string, user: { accessToken: string }): Promise<CourtVenue[]> => {
  const url = `${getBaseUrl()}/courts?postcode=${encodeURIComponent(postcode)}`;
  const headersConfig = {
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
    },
  };
  logger.info(`Calling PCS court search with URL: ${url}`);
  const response = await axios.get<CourtVenue[]>(url, headersConfig);
  return response.data;
};

export const getDashboardNotifications = async (caseReference: number): Promise<DashboardNotification[]> => {
  const pcsApiURL = getBaseUrl();
  const response = await axios.get<DashboardNotification[]>(`${pcsApiURL}/dashboard/${caseReference}/notifications`);

  // eslint-disable-next-line no-console
  console.log('response=> ', response);
  return response.data;
};
