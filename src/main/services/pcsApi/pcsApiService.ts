import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';

import { http } from '../../modules/http';

import { type DashboardNotification } from './dashboardNotification.interface';
import { type DashboardTaskGroup } from './dashboardTaskGroup.interface';

const logger = Logger.getLogger('pcsApiService');

function getBaseUrl(): string {
  return config.get('api.url');
}

export const getRootGreeting = async (): Promise<string> => {
  const pcsApiURL = getBaseUrl();
  logger.info(`[getRootGreeting] Calling PCS API: ${pcsApiURL}`);
  try {
    const response = await http.get<string>(pcsApiURL);
    logger.info(`[getRootGreeting] Response data: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (error) {
    logger.error(`[getRootGreeting] Error calling PCS API: ${error.message}`);
    throw error;
  }
};

export const getDashboardNotifications = async (caseReference: number): Promise<DashboardNotification[]> => {
  const pcsApiURL = getBaseUrl();
  const url = `${pcsApiURL}/dashboard/${caseReference}/notifications`;
  logger.info(`[getDashboardNotifications] Calling PCS API: ${url}`);
  try {
    const response = await http.get<DashboardNotification[]>(url);
    logger.info(`[getDashboardNotifications] Response data: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (error) {
    logger.error(`[getDashboardNotifications] Error calling PCS API: ${error.message}`);
    throw error;
  }
};

export const getDashboardTaskGroups = async (caseReference: number): Promise<DashboardTaskGroup[]> => {
  const pcsApiURL = getBaseUrl();
  const url = `${pcsApiURL}/dashboard/${caseReference}/tasks`;
  logger.info(`[getDashboardTaskGroups] Calling PCS API: ${url}`);
  try {
    const response = await http.get<DashboardTaskGroup[]>(url);
    logger.info(`[getDashboardTaskGroups] Response data: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (error) {
    logger.error(`[getDashboardTaskGroups] Error calling PCS API: ${error.message}`);
    throw error;
  }
};
