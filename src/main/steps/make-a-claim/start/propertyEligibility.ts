import type { Request } from 'express';

import { getUserToken } from '../../utils/userRole';
import { addressFromBody } from '../formValues';

import { PROPERTY_COUNTRY_URL, PROPERTY_INELIGIBLE_URL, PROPERTY_NOT_COVERED_URL } from './createClaim';

import { Logger } from '@modules/logger';
import { getFormData } from '@modules/steps';
import { type PropertyEligibilityStatus, getPropertyEligibility } from '@services/pcsApi/pcsApiService';

const logger = Logger.getLogger('propertyEligibility');

const STATUS_REDIRECTS: Partial<Record<PropertyEligibilityStatus, string>> = {
  NOT_ENGLAND: PROPERTY_INELIGIBLE_URL,
  NOT_COVERED: PROPERTY_NOT_COVERED_URL,
  LEGISLATIVE_COUNTRY_REQUIRED: PROPERTY_COUNTRY_URL,
};

/**
 * Where to send a claimant whose property pcs-api cannot take a claim for, checked as soon as they give it rather
 * than when the claim is created. Undefined when it can, or when the check fails: creating the claim checks again.
 */
export async function propertyEligibilityRedirect(
  req: Request,
  legislativeCountry?: 'England'
): Promise<string | undefined> {
  const postcode = addressFromBody(getFormData(req, 'property-address'), 'property')?.PostCode;
  if (!postcode) {
    return undefined;
  }
  try {
    return STATUS_REDIRECTS[await getPropertyEligibility(getUserToken(req), postcode, legislativeCountry)];
  } catch (error) {
    logger.warn(`Property eligibility check failed, leaving it to the claim's creation: ${(error as Error).message}`);
    return undefined;
  }
}
