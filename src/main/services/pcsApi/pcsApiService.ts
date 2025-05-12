import { Logger } from '@hmcts/nodejs-logging';
import axios from 'axios';
import config from 'config';

import type { CourtVenue } from '../../interface/courtVenue.interface';

import { type DashboardNotification } from './dashboardNotification.interface';
import { type DashboardTaskGroup } from './dashboardTaskGroup.interface';

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
  return response.data;
};

export const getDashboardTaskGroups = async (caseReference: number, origin: string): Promise<DashboardTaskGroup[]> => {
  const url = `${origin}/assets/fixtures/taskgroups-${caseReference}.json`;
  logger.info(`Calling PCS task groups with URL: ${url}`);
  const response = await axios.get<DashboardTaskGroup[]>(url);
  return response.data;
};
