import config from 'config';

import { type DashboardNotification, type DashboardTaskGroup } from '../dashboard.interface';

import { http } from '@modules/http';

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

export type PinValidationError = 'not_found' | 'expired' | 'already_used' | 'mismatch' | 'unknown';
export type PinValidationResult = { valid: true } | { valid: false; error: PinValidationError };

export const validateAccessCodeDetailed = async (
  accessToken: string,
  caseId: string,
  accessCode: string
): Promise<PinValidationResult> => {
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
        validateStatus: () => true,
      }
    );

    if (response.status >= 200 && response.status < 300) {
      return { valid: true };
    }

    switch (response.status) {
      case 404:
        return { valid: false, error: 'not_found' };
      case 410:
        return { valid: false, error: 'expired' };
      case 409:
        return { valid: false, error: 'already_used' };
      case 422:
      case 400:
        return { valid: false, error: 'mismatch' };
      default:
        return { valid: false, error: 'unknown' };
    }
  } catch {
    return { valid: false, error: 'unknown' };
  }
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
