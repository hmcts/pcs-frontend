import type { Request } from 'express';

import { getAllFormData } from '@modules/steps';
import type { LegislativeCountry } from '@services/citizenPossessionClaim.interface';

/** Where the session keeps the country pcs-api's property check found the property in. */
export const PROPERTY_CHECK = 'property-eligibility';

/** The country the property is in, as the claimant chose it or the property check found it. */
export function propertyCountry(req: Request): LegislativeCountry | undefined {
  const answers = getAllFormData(req);
  return (answers['property-country']?.legislativeCountry ?? answers[PROPERTY_CHECK]?.legislativeCountry) as
    LegislativeCountry | undefined;
}

export const isWelshProperty = (req: Request): boolean => propertyCountry(req) === 'Wales';

/** Whether the claimant was turned away by the Wales claimant type question rather than the England one. */
export const turnedAwayInWales = (req: Request): boolean => {
  const walesClaimantType = getAllFormData(req)['wales-claimant-type']?.walesClaimantType;
  return walesClaimantType !== undefined && walesClaimantType !== 'PRIVATE_LANDLORD';
};
