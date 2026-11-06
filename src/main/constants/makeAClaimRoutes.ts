/** Path patterns of the private landlord make a claim journey, for its routes and its feature gate. */
export const MAKE_A_CLAIM_START_ROUTE = '/make-a-claim';

export const PROPERTY_INELIGIBLE_URL = `${MAKE_A_CLAIM_START_ROUTE}/property-ineligible`;

export const MAKE_A_CLAIM_ROUTE = '/case/:caseReference/make-a-claim';

export const PAY_CLAIM_FEE_ROUTE = '/case/:caseReference/pay-claim-fee';

export const PAY_CLAIM_FEE_START_ROUTE = `${PAY_CLAIM_FEE_ROUTE}/start`;

export const CLAIM_SUBMITTED_ROUTE = '/case/:caseReference/claim-submitted';

/** Every path pattern the journey serves; each also covers the paths below it. */
export const MAKE_A_CLAIM_ROUTES = [
  MAKE_A_CLAIM_START_ROUTE,
  MAKE_A_CLAIM_ROUTE,
  PAY_CLAIM_FEE_ROUTE,
  CLAIM_SUBMITTED_ROUTE,
] as const;

export function makeAClaimPath(route: string, caseReference: string): string {
  return route.replace(':caseReference', caseReference);
}
