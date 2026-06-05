import { type Request } from 'express';

import {
  hasAnyRentArrearsGround,
  hasMadeCounterClaim,
  hasOnlyRentArrearsGrounds,
  hasSkippedEqualityAndDiversityQuestions,
  isDefendantNameKnown,
  isNoticeServed,
  isSomethingElseCounterClaim,
  isTenancyStartDateKnown,
  isWalesProperty,
  shouldShowCounterClaimFeePaymentNeededConfirmationStep,
  shouldShowResponseAndCounterClaimSubmittedConfirmationStep,
  shouldShowResponseSubmittedConfirmationStep,
} from '../utils';

import {
  hasConfirmedInstallmentOffer,
  hasProvidedFinanceDetails,
  isNoticeDateConfirmedAndNotProvided,
  isNoticeDateConfirmedAndProvided,
  shouldShowCounterClaimAboutStep,
  shouldShowCounterClaimAgainstWhoStep,
  shouldShowCounterClaimHelpWithFeesStep,
  shouldShowCounterClaimNeedToApplyStep,
  shouldShowInstallmentPaymentsStep,
  shouldShowPriorityDebtDetailsStep,
  shouldShowUniversalCreditStep,
} from './flowConditions';
import { respondToClaimSections } from './sections.config';
import type { RespondToClaimStepName } from './stepRegistry';
import { isMoneyCounterClaim } from './utils';

import type { JourneyFlowConfig, StepConfig } from '@modules/steps/stepFlow.interface';

export const RESPOND_TO_CLAIM_ROUTE = '/case/:caseReference/respond-to-claim';

export const flowConfig: JourneyFlowConfig = {
  basePath: RESPOND_TO_CLAIM_ROUTE,
  journeyName: 'respondToClaim',
  useShowConditions: true,
  useSessionFormData: false,
  eventId: 'respondPossessionClaim',
  sections: respondToClaimSections,
  nonSectionStepOrder: ['end-now', 'task-list'],
  // First visible step of any section back-links to this hub step.
  hubStepName: 'task-list',
  steps: {
    'defendant-name-confirmation': {
      showCondition: (req: Request) => isDefendantNameKnown(req),
    },
    'defendant-name-capture': {
      showCondition: (req: Request) => !isDefendantNameKnown(req),
    },
    'contact-preferences-text-message': {
      showCondition: (req: Request) => req.res?.locals.validatedCase?.isDefendantContactByPhone === true,
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
    'counter-claim-have-you-applied-for-help': {
      showCondition: (req: Request) => shouldShowCounterClaimHelpWithFeesStep(req),
    },
    'counter-claim-you-need-to-apply-for-help-with-your-fees': {
      showCondition: (req: Request) => shouldShowCounterClaimNeedToApplyStep(req),
    },
    'counter-claim-against-whom': {
      showCondition: (req: Request) => shouldShowCounterClaimAgainstWhoStep(req),
    },
    'counter-claim-about': {
      showCondition: (req: Request) => shouldShowCounterClaimAboutStep(req),
    },
    'counter-claim-order-other-than-sum': {
      showCondition: (req: Request) => isSomethingElseCounterClaim(req),
    },
    'counter-claim-upload-documents': {
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
      showCondition: (req: Request) => shouldShowPriorityDebtDetailsStep(req),
    },
    'what-other-regular-expenses-do-you-have': {
      showCondition: (req: Request) => hasProvidedFinanceDetails(req),
    },
    'equality-and-diversity-end': {
      showCondition: (req: Request) => !hasSkippedEqualityAndDiversityQuestions(req),
    },
    'response-submitted': {
      showCondition: (req: Request) =>
        shouldShowResponseSubmittedConfirmationStep(req.res?.locals?.validatedCase?.data),
    },
    'response-submitted-counter-claim-fee-payment-needed': {
      showCondition: (req: Request) =>
        shouldShowCounterClaimFeePaymentNeededConfirmationStep(req.res?.locals?.validatedCase?.data),
    },
    'response-and-counter-claim-submitted': {
      showCondition: (req: Request) =>
        shouldShowResponseAndCounterClaimSubmittedConfirmationStep(req.res?.locals?.validatedCase?.data),
    },
  } satisfies Partial<Record<RespondToClaimStepName, StepConfig>>,
};
