import { type Request } from 'express';

import {
  hasAnyRentArrearsGround,
  hasMadeCounterClaim,
  hasOnlyRentArrearsGrounds,
  hasSkippedEqualityAndDiversityQuestions,
  isDefendantNameKnown,
  isNoticeServed,
  isTenancyStartDateKnown,
  isWalesProperty,
} from '../utils';

import {
  hasConfirmedInstallmentOffer,
  hasProvidedFinanceDetails,
  isNoticeDateConfirmedAndNotProvided,
  isNoticeDateConfirmedAndProvided,
  shouldShowInstallmentPaymentsStep,
  shouldShowUniversalCreditStep,
} from './flowConditions';
import { isMoneyCounterClaim } from './utils';

import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

export const RESPOND_TO_CLAIM_ROUTE = '/case/:caseReference/respond-to-claim';

export const flowConfig: JourneyFlowConfig = {
  basePath: RESPOND_TO_CLAIM_ROUTE,
  journeyName: 'respondToClaim',
  useShowConditions: true,
  useSessionFormData: false,
  eventId: 'respondPossessionClaim',
  stepOrder: [
    'start-now',
    'free-legal-advice',
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
    'other-considerations',
    'upload-docs',
    'equality-and-diversity-start',
    'equality-and-diversity-end',
    'language-used',
    'check-your-answers',
    'end-now',
  ],
  steps: {
    'defendant-name-confirmation': {
      showCondition: (req: Request) => isDefendantNameKnown(req),
    },
    'defendant-name-capture': {
      showCondition: (req: Request) => !isDefendantNameKnown(req),
    },
    'contact-preferences-text-message': {
      showCondition: (req: Request) => req.res?.locals?.validatedCase?.isDefendantContactByPhone === true,
    },
    'landlord-registered': {
      showCondition: (req: Request) => isWalesProperty(req),
    },
    'landlord-licensed': {
      showCondition: (req: Request) => isWalesProperty(req),
    },
    'written-terms': {
      showCondition: (req: Request) => isWalesProperty(req),
    },
    'tenancy-date-unknown': {
      showCondition: (req: Request) => !isTenancyStartDateKnown(req),
    },
    'tenancy-date-details': {
      showCondition: (req: Request) => isTenancyStartDateKnown(req),
    },
    'confirmation-of-notice-given': {
      showCondition: (req: Request) => isNoticeServed(req),
    },

    'confirmation-of-notice-date-when-provided': {
      showCondition: (req: Request) => isNoticeDateConfirmedAndProvided(req),
    },
    'confirmation-of-notice-date-when-not-provided': {
      showCondition: (req: Request) => isNoticeDateConfirmedAndNotProvided(req),
    },
    'rent-arrears-dispute': {
      showCondition: (req: Request) => hasAnyRentArrearsGround(req),
    },
    'non-rent-arrears-dispute': {
      showCondition: (req: Request) => !hasOnlyRentArrearsGrounds(req),
    },
    'counter-claim-specific-sum': {
      showCondition: (req: Request) => isMoneyCounterClaim(req),
    },
    'counter-claim-what-are-you-claiming-for': {
      showCondition: (req: Request) => hasMadeCounterClaim(req),
    },
    'counter-claim-fee': {
      showCondition: (req: Request) => hasMadeCounterClaim(req),
    },
    'payment-interstitial': {
      showCondition: (req: Request) => hasAnyRentArrearsGround(req),
    },
    'repayments-made': {
      showCondition: (req: Request) => hasAnyRentArrearsGround(req),
    },
    'repayments-agreed': {
      showCondition: (req: Request) => hasAnyRentArrearsGround(req),
    },
    'installment-payments': {
      showCondition: (req: Request) => shouldShowInstallmentPaymentsStep(req),
    },
    'how-much-afford-to-pay': {
      showCondition: (req: Request) => hasConfirmedInstallmentOffer(req),
    },
    'what-regular-income-do-you-receive': {
      showCondition: (req: Request) => hasProvidedFinanceDetails(req),
    },
    'have-you-applied-for-universal-credit': {
      showCondition: (req: Request) => shouldShowUniversalCreditStep(req),
    },
    'priority-debts': {
      showCondition: (req: Request) => hasProvidedFinanceDetails(req),
    },
    'priority-debt-details': {
      showCondition: (req: Request) => hasProvidedFinanceDetails(req),
    },
    'what-other-regular-expenses-do-you-have': {
      showCondition: (req: Request) => hasProvidedFinanceDetails(req),
    },
    'equality-and-diversity-end': {
      showCondition: (req: Request) => !hasSkippedEqualityAndDiversityQuestions(req),
    },
  },
};
