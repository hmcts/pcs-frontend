import config from 'config';

import { http } from '../../modules/http';

import { type DashboardNotification } from './dashboardNotification.interface';
import { type DashboardTaskGroup } from './dashboardTaskGroup.interface';

function getBaseUrl(): string {
  return config.get('api.url');
}

export const getRootGreeting = async (): Promise<string> => {
  const pcsApiURL = getBaseUrl();
  const response = await http.get<string>(pcsApiURL);
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

export const validateAccessCode = async (accessToken: string, caseId: string, accessCode: string): Promise<boolean> => {
  const pcsApiURL = getBaseUrl();
  try {
    const response = await http.post(
      `${pcsApiURL}/cases/${caseId}/validate-access-code`,
      { accessCode },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Verify successful response status (2xx)
    if (response.status >= 200 && response.status < 300) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};
