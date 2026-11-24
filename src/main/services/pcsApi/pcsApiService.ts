import config from 'config';

import { http } from '@modules/http';
import type { ClaimSummary, ClaimantClaimSummary } from '@services/ccdCase.interface';
import type { LegislativeCountry } from '@services/citizenPossessionClaim.interface';

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

/** Whether pcs-api can take a private landlord's claim for a property, by its postcode. */
export type PropertyEligibilityStatus =
  'ELIGIBLE' | 'NOT_ENGLAND_OR_WALES' | 'NO_COURT' | 'LEGISLATIVE_COUNTRY_REQUIRED';

const PROPERTY_ELIGIBILITY_STATUSES: PropertyEligibilityStatus[] = [
  'ELIGIBLE',
  'NOT_ENGLAND_OR_WALES',
  'NO_COURT',
  'LEGISLATIVE_COUNTRY_REQUIRED',
];

export interface PropertyEligibility {
  status: PropertyEligibilityStatus;
  /** The country an eligible property is in. */
  legislativeCountry?: LegislativeCountry;
}

const LEGISLATIVE_COUNTRIES: LegislativeCountry[] = ['England', 'Wales'];

export const getPropertyEligibility = async (
  accessToken: string,
  postcode: string,
  legislativeCountry?: LegislativeCountry
): Promise<PropertyEligibility> => {
  const response = await http.get<{ status?: PropertyEligibilityStatus; legislativeCountry?: LegislativeCountry }>(
    `${getBaseUrl()}/cases/citizen-claims/property-eligibility`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { postcode, ...(legislativeCountry ? { legislativeCountry } : {}) },
    }
  );
  const status = response.data?.status;
  const country = response.data?.legislativeCountry;
  if (
    !status ||
    !PROPERTY_ELIGIBILITY_STATUSES.includes(status) ||
    (status === 'ELIGIBLE' && (!country || !LEGISLATIVE_COUNTRIES.includes(country)))
  ) {
    throw new Error('Unexpected response from property-eligibility endpoint');
  }
  return status === 'ELIGIBLE' ? { status, legislativeCountry: country } : { status };
};

export const getCitizenClaims = async (accessToken: string): Promise<ClaimSummary[]> => {
  const response = await http.get<ClaimSummary[]>(`${getBaseUrl()}/cases/citizen-claims`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!Array.isArray(response.data)) {
    throw new Error('Unexpected response from citizen-claims endpoint');
  }
  return response.data;
};

export const getClaimantClaims = async (accessToken: string): Promise<ClaimantClaimSummary[]> => {
  const response = await http.get<ClaimantClaimSummary[]>(`${getBaseUrl()}/cases/citizen-claims/as-claimant`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!Array.isArray(response.data)) {
    throw new Error('Unexpected response from citizen-claims as-claimant endpoint');
  }
  return response.data;
};
