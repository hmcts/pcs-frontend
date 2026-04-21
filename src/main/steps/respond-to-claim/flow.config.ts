import { type Request } from 'express';

import {
  hasAnyRentArrearsGround,
  hasOnlyRentArrearsGrounds,
  isDefendantNameKnown,
  isNoticeServed,
  isTenancyStartDateKnown,
  isWelshProperty,
} from '../utils';

import {
  isNoticeDateConfirmedAndNotProvided,
  isNoticeDateConfirmedAndProvided,
  shouldShowHowMuchAffordToPayStep,
  shouldShowInstallmentPaymentsStep,
} from './flowConditions';

import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

export const RESPOND_TO_CLAIM_ROUTE = '/case/:caseReference/respond-to-claim';

export const flowConfig: JourneyFlowConfig = {
  basePath: RESPOND_TO_CLAIM_ROUTE,
  journeyName: 'respondToClaim',
  useShowConditions: true,
  useSessionFormData: false,
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
    'income-and-expenditure',
    'what-regular-income-do-you-receive',
    'have-you-applied-for-universal-credit',
    'priority-debts',
    'priority-debt-details',
    'what-other-regular-expenses-do-you-have',
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
      showCondition: (req: Request) => isWelshProperty(req),
    },
    'landlord-licensed': {
      showCondition: (req: Request) => isWelshProperty(req),
    },
    'written-terms': {
      showCondition: (req: Request) => isWelshProperty(req),
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
    'installment-payments': {
      showCondition: (req: Request) => shouldShowInstallmentPaymentsStep(req),
    },
    'how-much-afford-to-pay': {
      showCondition: (req: Request) => shouldShowHowMuchAffordToPayStep(req),
    },
  },
};
