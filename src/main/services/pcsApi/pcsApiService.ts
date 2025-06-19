import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';

import type { CourtVenue } from '../../interfaces/courtVenue.interface';
import { http } from '../../modules/http';

import { type DashboardNotification } from './dashboardNotification.interface';
import { type DashboardTaskGroup } from './dashboardTaskGroup.interface';

const logger = Logger.getLogger('pcsApiService');

function getBaseUrl(): string {
  return config.get('api.url');
}

export const getRootGreeting = async (): Promise<string> => {
  const pcsApiURL = getBaseUrl();
  const response = await http.get<string>(pcsApiURL);
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
  const response = await http.get<CourtVenue[]>(url, headersConfig);
  return response.data;
};

export const getDashboardNotifications = async (caseReference: number): Promise<DashboardNotification[]> => {
  const pcsApiURL = getBaseUrl();
  const response = await http.get<DashboardNotification[]>(`${pcsApiURL}/dashboard/${caseReference}/notifications`);
  return response.data;
};

export const getDashboardTaskGroups = async (caseReference: number): Promise<DashboardTaskGroup[]> => {
  const pcsApiURL = getBaseUrl();
  const response = await http.get<DashboardTaskGroup[]>(`${pcsApiURL}/dashboard/${caseReference}/tasks`);
  return response.data;
};
