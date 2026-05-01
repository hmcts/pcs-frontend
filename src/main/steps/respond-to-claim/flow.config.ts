import { type Request } from 'express';

import {
  getPreviousStepForYourHouseholdAndCircumstances,
  getStepBeforeDisputePages,
  hasAnyRentArrearsGround,
  hasOnlyRentArrearsGrounds,
  hasSkippedEqualityAndDiversityQuestions,
  isDefendantNameKnown,
  isFromIncomeAndExpenditure,
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
    'income-and-expenses',
    'what-regular-income-do-you-receive',
    'have-you-applied-for-universal-credit',
    'priority-debts',
    'priority-debt-details',
    'what-other-regular-expenses-do-you-have',
    'other-considerations',
    'upload-document',
    'support-needs',
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
      defaultNext: 'counter-claim',
      previousStep: async (req: Request) => {
        const rentArrearsClaim = await hasAnyRentArrearsGround(req);
        if (rentArrearsClaim) {
          return 'rent-arrears-dispute';
        }
        return getStepBeforeDisputePages(req);
      },
    },
    'counter-claim': {
      defaultNext: 'payment-interstitial',
      previousStep: async (req: Request) => {
        const onlyRentArrears = await hasOnlyRentArrearsGrounds(req);
        return onlyRentArrears ? 'rent-arrears-dispute' : 'non-rent-arrears-dispute';
      },
    },
    'payment-interstitial': {
      previousStep: 'counter-claim',
      defaultNext: 'repayments-made',
    },
    'repayments-made': {
      previousStep: 'payment-interstitial',
      defaultNext: 'repayments-agreed',
    },
    'repayments-agreed': {
      routes: [
        {
          condition: async (
            req: Request,
            _formData: Record<string, unknown>,
            currentStepData: Record<string, unknown>
          ): Promise<boolean> => {
            if (currentStepData.repaymentsAgreed !== 'no') {
              return false;
            }
            return hasAnyRentArrearsGround(req);
          },
          nextStep: 'installment-payments',
        },
        {
          condition: async (
            _req: Request,
            _formData: Record<string, unknown>,
            currentStepData: Record<string, unknown>
          ): Promise<boolean> =>
            currentStepData.repaymentsAgreed === 'yes' || currentStepData.repaymentsAgreed === 'imNotSure',
          nextStep: 'your-household-and-circumstances',
        },
      ],
      previousStep: 'repayments-made',
    },
    'installment-payments': {
      showCondition: (req: Request) => shouldShowInstallmentPaymentsStep(req),
      previousStep: 'repayments-agreed',
      routes: [
        {
          condition: async (
            _req: Request,
            _formData: Record<string, unknown>,
            currentStepData: Record<string, unknown>
          ): Promise<boolean> => currentStepData?.confirmInstallmentOffer === 'yes',
          nextStep: 'how-much-afford-to-pay',
        },
      ],
      defaultNext: 'your-household-and-circumstances',
    },
    'how-much-afford-to-pay': {
      showCondition: (req: Request) => hasConfirmedInstallmentOffer(req),
      previousStep: 'installment-payments',
      defaultNext: 'your-household-and-circumstances',
    },
    'your-household-and-circumstances': {
      previousStep: (req: Request) => getPreviousStepForYourHouseholdAndCircumstances(req),
      defaultNext: 'do-you-have-any-dependant-children',
    },
    'do-you-have-any-dependant-children': {
      previousStep: 'your-household-and-circumstances',
      defaultNext: 'do-you-have-any-other-dependants',
    },
    'do-you-have-any-other-dependants': {
      previousStep: 'do-you-have-any-dependant-children',
      defaultNext: 'do-any-other-adults-live-in-your-home',
    },
    'do-any-other-adults-live-in-your-home': {
      previousStep: 'do-you-have-any-other-dependants',
      defaultNext: 'would-you-have-somewhere-else-to-live-if-you-had-to-leave-your-home',
    },
    'would-you-have-somewhere-else-to-live-if-you-had-to-leave-your-home': {
      previousStep: 'do-any-other-adults-live-in-your-home',
      defaultNext: 'your-circumstances',
    },
    'your-circumstances': {
      previousStep: 'would-you-have-somewhere-else-to-live-if-you-had-to-leave-your-home',
      defaultNext: 'exceptional-hardship',
    },
    'exceptional-hardship': {
      previousStep: 'your-circumstances',
      defaultNext: 'income-and-expenses',
    },
    'income-and-expenses': {
      previousStep: 'exceptional-hardship',
      routes: [
        {
          condition: async (req: Request): Promise<boolean> => !hasProvidedFinanceDetails(req),
          nextStep: 'other-considerations',
        },
        {
          condition: async (req: Request): Promise<boolean> => hasProvidedFinanceDetails(req),
          nextStep: 'what-regular-income-do-you-receive',
        },
      ],
      defaultNext: 'what-regular-income-do-you-receive',
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
      previousStep: 'priority-debt-details',
      defaultNext: 'other-considerations',
    },
    'other-considerations': {
      previousStep: async (req: Request): Promise<string> => {
        const fromIncomeExpenditure = await isFromIncomeAndExpenditure(req);
        return fromIncomeExpenditure ? 'income-and-expenses' : 'what-other-regular-expenses-do-you-have';
      },
      defaultNext: 'upload-document',
    },
    'upload-document': {
      previousStep: 'other-considerations',
      defaultNext: 'support-needs',
    },
    'support-needs': {
      previousStep: 'upload-document',
      defaultNext: 'equality-and-diversity-start',
    },
    'equality-and-diversity-start': {
      previousStep: 'support-needs',
      routes: [
        {
          condition: async (
            _req: Request,
            _formData: Record<string, unknown>,
            currentStepData: Record<string, unknown>
          ) => currentStepData.equalityStartChoice === 'skip',
          nextStep: 'language-used',
        },
        {
          condition: async (
            _req: Request,
            _formData: Record<string, unknown>,
            currentStepData: Record<string, unknown>
          ) => currentStepData.equalityStartChoice === 'continue',
          nextStep: 'equality-and-diversity-end',
        },
      ],
      defaultNext: 'equality-and-diversity-end',
    },
    'equality-and-diversity-end': {
      showCondition: (req: Request) => !hasSkippedEqualityAndDiversityQuestions(req),
    },
  },
};
