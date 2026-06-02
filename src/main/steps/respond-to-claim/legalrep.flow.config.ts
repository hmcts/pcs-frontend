import { RESPOND_TO_CLAIM_ROUTE, flowConfig as citizenFlowConfig } from './flow.config';
import type { RespondToClaimStepName } from './stepRegistry';

import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

const legalrepStepOrder = [
  'start-now',
  'defendant-name-confirmation',
  'defendant-name-capture',
  'defendant-date-of-birth',
  'correspondence-address',
  'contact-preferences-email-or-post',
  'contact-preferences-telephone',
  'contact-preferences-text-message',
  'dispute-claim-interstitial',
  'landlord-registered',
  'landlord-licensed',
  'written-terms',
  'tenancy-type-details',
  'tenancy-date-details',
  'tenancy-date-unknown',
  'confirmation-of-notice-given',
  'confirmation-of-notice-date-when-provided',
  'confirmation-of-notice-date-when-not-provided',
  'rent-arrears-dispute',
  'non-rent-arrears-dispute',
  'counter-claim',
  'counter-claim-what-are-you-claiming-for',
  'counter-claim-specific-sum',
  'counter-claim-fee',
  'payment-interstitial',
  'repayments-made',
  'repayments-agreed',
  'installment-payments',
  'how-much-afford-to-pay',
  'your-household-and-circumstances',
  'do-you-have-any-dependant-children',
  'do-you-have-any-other-dependants',
  'do-any-other-adults-live-in-your-home',
  'would-you-have-somewhere-else-to-live-if-you-had-to-leave-your-home',
  'your-circumstances',
  'exceptional-hardship',
  'income-and-expenses',
  'what-regular-income-do-you-receive',
  'have-you-applied-for-universal-credit',
  'priority-debts',
  'priority-debt-details',
  'what-other-regular-expenses-do-you-have',
  'equality-and-diversity-start',
  'equality-and-diversity-end',
  'language-used',
  'check-your-answers',
  'end-now',
] as const satisfies readonly RespondToClaimStepName[];

// Legal-rep journey is a flat, linear stepOrder. It is intentionally NOT sectionalised
// (citizen is). Construct explicitly instead of spreading citizenFlowConfig so we don't
// silently inherit `sections` / `nonSectionStepOrder` and have the engine pick
// section-traversal over our linear stepOrder.
export const legalrepFlowConfig: JourneyFlowConfig = {
  basePath: RESPOND_TO_CLAIM_ROUTE,
  journeyName: 'respondToClaimLegalrep',
  useShowConditions: true,
  useSessionFormData: false,
  stepOrder: legalrepStepOrder,
  steps: citizenFlowConfig.steps,
};
