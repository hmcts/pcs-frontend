import type { Request } from 'express';

import { getUserToken } from '../../utils/userRole';
import { addressFromBody } from '../formValues';

import { PROPERTY_COUNTRY_URL, PROPERTY_INELIGIBLE_URL, WALES_CLAIMANT_TYPE_URL } from './createClaim';
import { PROPERTY_CHECK } from './propertyCountry';

import { Logger } from '@modules/logger';
import { getAllFormData, getFormData, setFormData } from '@modules/steps';
import type { LegislativeCountry } from '@services/citizenPossessionClaim.interface';
import { type PropertyEligibilityStatus, getPropertyEligibility } from '@services/pcsApi/pcsApiService';

const logger = Logger.getLogger('propertyEligibility');

const STATUS_REDIRECTS: Partial<Record<PropertyEligibilityStatus, string>> = {
  NOT_ENGLAND_OR_WALES: PROPERTY_INELIGIBLE_URL,
  NO_COURT: PROPERTY_INELIGIBLE_URL,
  LEGISLATIVE_COUNTRY_REQUIRED: PROPERTY_COUNTRY_URL,
};

/**
 * Checks the property with pcs-api as soon as the claimant gives it, rather than when the claim is created, and
 * keeps the country it is in. Gives where to send a claimant whose property cannot be claimed for or needs its
 * country choosing, and the Wales questions for a property in Wales. Undefined for a property in England, or when
 * the check fails: creating the claim checks again.
 */
export async function propertyEligibilityRedirect(
  req: Request,
  legislativeCountry?: LegislativeCountry
): Promise<string | undefined> {
  delete getAllFormData(req)[PROPERTY_CHECK];
  const postcode = addressFromBody(getFormData(req, 'property-address'), 'property')?.PostCode;
  if (!postcode) {
    return undefined;
  }
  try {
    const eligibility = await getPropertyEligibility(getUserToken(req), postcode, legislativeCountry);
    if (eligibility.legislativeCountry) {
      setFormData(req, PROPERTY_CHECK, { legislativeCountry: eligibility.legislativeCountry });
    }
    return (
      STATUS_REDIRECTS[eligibility.status] ??
      (eligibility.legislativeCountry === 'Wales' ? WALES_CLAIMANT_TYPE_URL : undefined)
    );
  } catch (error) {
    logger.warn(`Property eligibility check failed, leaving it to the claim's creation: ${(error as Error).message}`);
    return undefined;
  }
}
