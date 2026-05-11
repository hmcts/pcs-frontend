import config from 'config';

import { http } from '@modules/http';

function getBaseUrl(): string {
  return config.get('api.url');
}

export const getRootGreeting = async (): Promise<string> => {
  const pcsApiURL = getBaseUrl();
  const response = await http.get<string>(pcsApiURL);
  return response.data;
};

export type AccessCodeValidationError = 'not_found' | 'expired' | 'already_used' | 'mismatch' | 'unknown';
export type AccessCodeValidationResult = { valid: true } | { valid: false; error: AccessCodeValidationError };

export const validateAccessCode = async (
  accessToken: string,
  caseId: string,
  accessCode: string
): Promise<AccessCodeValidationResult> => {
  const pcsApiURL = getBaseUrl();
  const normalizedCaseId = caseId.trim().replace(/-/g, '');
  if (!/^\d{16,20}$/.test(normalizedCaseId)) {
    return { valid: false, error: 'not_found' };
  }
  const encodedCaseId = encodeURIComponent(normalizedCaseId);
  try {
    const response = await http.post(
      `${pcsApiURL}/cases/${encodedCaseId}/validate-access-code`,
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
