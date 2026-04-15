import { type Request } from 'express';

import {
  getPreviousStepForYourHouseholdAndCircumstances,
  getStepBeforeDisputePages,
  hasAnyRentArrearsGround,
  hasOnlyRentArrearsGrounds,
  hasSelectedUniversalCredit,
  isDefendantNameKnown,
  isFinanceDetailsProvided,
  isFromIncomeAndExpenditure,
  isNoticeDateProvided,
  isNoticeServed,
  isTenancyStartDateKnown,
  isUniversalCreditSelected,
  isWelshProperty,
} from '../utils';

import type { JourneyFlowConfig } from '@interfaces/stepFlow.interface';

export const RESPOND_TO_CLAIM_ROUTE = '/case/:caseReference/respond-to-claim';

function getContactByTelephoneAnswer(
  req: Request,
  currentStepData: Record<string, unknown> = {}
): 'yes' | 'no' | undefined {
  const currentAnswer = currentStepData.contactByTelephone;
  if (currentAnswer === 'yes' || currentAnswer === 'no') {
    return currentAnswer;
  }

  // Back-navigation fallback must always come from CCD data.
  const fromCcd = req.res?.locals?.validatedCase?.isDefendantContactByPhone;
  if (fromCcd === true) {
    return 'yes';
  }
  if (fromCcd === false) {
    return 'no';
  }

  return undefined;
}

function getConfirmNoticeGivenAnswer(
  req: Request,
  currentStepData: Record<string, unknown> = {}
): 'yes' | 'no' | 'imNotSure' | undefined {
  const currentAnswer = currentStepData.confirmNoticeGiven;
  if (currentAnswer === 'yes' || currentAnswer === 'no' || currentAnswer === 'imNotSure') {
    return currentAnswer;
  }

  const ccdAnswer = req.res?.locals?.validatedCase?.defendantResponsesConfirmNoticeGiven;
  if (ccdAnswer === 'yes' || ccdAnswer === 'no' || ccdAnswer === 'imNotSure') {
    return ccdAnswer;
  }

  return undefined;
}

export const flowConfig: JourneyFlowConfig = {
  basePath: RESPOND_TO_CLAIM_ROUTE,
  journeyName: 'respondToClaim',
  useSessionFormData: false,
  stepOrder: [
    'start-now',
    'free-legal-advice',
    'defendant-name-confirmation',
    'defendant-name-capture',
    'defendant-date-of-birth',
    'counter-claim',
    'payment-interstitial',
    'repayments-made',
    'repayments-agreed',
    'installment-payments',
    'how-much-afford-to-pay',
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
    'end-now',
  ],
  steps: {
    'start-now': {
      defaultNext: 'free-legal-advice',
    },
    'free-legal-advice': {
      routes: [
        {
          // Route to defendant name confirmation if defendant is known
          condition: async (req: Request) => isDefendantNameKnown(req),
          nextStep: 'defendant-name-confirmation',
        },
        {
          // Route to defendant name capture if defendant is unknown
          condition: async (req: Request) => !(await isDefendantNameKnown(req)),
          nextStep: 'defendant-name-capture',
        },
      ],
      defaultNext: 'defendant-name-capture',
    },
    'defendant-name-confirmation': {
      defaultNext: 'defendant-date-of-birth',
    },
    'defendant-name-capture': {
      defaultNext: 'defendant-date-of-birth',
    },
    'defendant-date-of-birth': {
      previousStep: async (req: Request) => {
        const nameKnown = await isDefendantNameKnown(req);
        return nameKnown ? 'defendant-name-confirmation' : 'defendant-name-capture';
      },
      defaultNext: 'correspondence-address',
    },
    'correspondence-address': {
      previousStep: 'defendant-date-of-birth',
      defaultNext: 'contact-preferences-email-or-post',
    },
    'contact-preferences-email-or-post': {
      previousStep: 'correspondence-address',
      defaultNext: 'contact-preferences-telephone',
    },
    'contact-preferences-telephone': {
      routes: [
        {
          condition: async (
            req: Request,
            _formData: Record<string, unknown>,
            currentStepData: Record<string, unknown>
          ): Promise<boolean> => getContactByTelephoneAnswer(req, currentStepData) === 'yes',
          nextStep: 'contact-preferences-text-message',
        },
        {
          condition: async (
            req: Request,
            _formData: Record<string, unknown>,
            currentStepData: Record<string, unknown>
          ): Promise<boolean> => getContactByTelephoneAnswer(req, currentStepData) === 'no',
          nextStep: 'dispute-claim-interstitial',
        },
      ],
      previousStep: 'contact-preferences-email-or-post',
    },
    'contact-preferences-text-message': {
      defaultNext: 'dispute-claim-interstitial',
    },
    'dispute-claim-interstitial': {
      routes: [
        {
          condition: async (req: Request) => isWelshProperty(req),
          nextStep: 'landlord-registered',
        },
        {
          condition: async (req: Request) => !(await isWelshProperty(req)),
          nextStep: 'tenancy-type-details',
        },
      ],
      defaultNext: 'tenancy-type-details',
    },
    'landlord-registered': {
      defaultNext: 'landlord-licensed',
      previousStep: 'dispute-claim-interstitial',
    },
    'landlord-licensed': {
      defaultNext: 'written-terms',
    },
    'written-terms': {
      defaultNext: 'tenancy-type-details',
      previousStep: 'landlord-licensed',
    },
    'tenancy-type-details': {
      routes: [
        {
          condition: async (req: Request) => isTenancyStartDateKnown(req),
          nextStep: 'tenancy-date-details',
        },
        {
          condition: async (req: Request): Promise<boolean> => !(await isTenancyStartDateKnown(req)),
          nextStep: 'tenancy-date-unknown',
        },
      ],
      previousStep: async (req: Request) => {
        const welshProperty = await isWelshProperty(req);
        if (welshProperty) {
          return 'written-terms';
        }
        return 'dispute-claim-interstitial';
      },
    },
    'tenancy-date-unknown': {
      routes: [
        {
          condition: async (req: Request) => isNoticeServed(req),
          nextStep: 'confirmation-of-notice-given',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const rentArrears = await hasAnyRentArrearsGround(req);
            return rentArrears;
          },
          nextStep: 'rent-arrears-dispute',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const rentArrears = await hasAnyRentArrearsGround(req);
            return !rentArrears;
          },
          nextStep: 'non-rent-arrears-dispute',
        },
      ],
      previousStep: 'tenancy-type-details',
    },
    'tenancy-date-details': {
      routes: [
        {
          condition: async (req: Request) => isNoticeServed(req),
          nextStep: 'confirmation-of-notice-given',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const rentArrears = await hasAnyRentArrearsGround(req);
            return rentArrears;
          },
          nextStep: 'rent-arrears-dispute',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const rentArrears = await hasAnyRentArrearsGround(req);
            return !rentArrears;
          },
          nextStep: 'non-rent-arrears-dispute',
        },
      ],
      previousStep: 'tenancy-type-details',
    },
    'confirmation-of-notice-given': {
      routes: [
        {
          condition: async (
            req: Request,
            _formData: Record<string, unknown>,
            currentStepData: Record<string, unknown>
          ): Promise<boolean> => {
            const confirmNoticeGiven = getConfirmNoticeGivenAnswer(req, currentStepData);
            if (confirmNoticeGiven !== 'yes') {
              return false;
            }
            const noticeDateProvided = await isNoticeDateProvided(req);
            return noticeDateProvided;
          },
          nextStep: 'confirmation-of-notice-date-when-provided',
        },
        {
          condition: async (
            req: Request,
            _formData: Record<string, unknown>,
            currentStepData: Record<string, unknown>
          ): Promise<boolean> => {
            const confirmNoticeGiven = getConfirmNoticeGivenAnswer(req, currentStepData);
            if (confirmNoticeGiven !== 'yes') {
              return false;
            }
            const noticeDateProvided = await isNoticeDateProvided(req);
            return !noticeDateProvided;
          },
          nextStep: 'confirmation-of-notice-date-when-not-provided',
        },
        {
          condition: async (
            req: Request,
            _formData: Record<string, unknown>,
            currentStepData: Record<string, unknown>
          ): Promise<boolean> => {
            const confirmNoticeGiven = getConfirmNoticeGivenAnswer(req, currentStepData);
            // Treat any non-yes value as "not yes" to avoid falling through
            // to notice-date pages when CCD returns an unexpected string.
            if (confirmNoticeGiven === 'yes') {
              return false;
            }
            const rentArrears = await hasAnyRentArrearsGround(req);
            return rentArrears;
          },
          nextStep: 'rent-arrears-dispute',
        },
        {
          condition: async (
            req: Request,
            _formData: Record<string, unknown>,
            currentStepData: Record<string, unknown>
          ): Promise<boolean> => {
            const confirmNoticeGiven = getConfirmNoticeGivenAnswer(req, currentStepData);
            // Treat any non-yes value as "not yes" to avoid falling through
            // to notice-date pages when CCD returns an unexpected string.
            if (confirmNoticeGiven === 'yes') {
              return false;
            }
            const rentArrears = await hasAnyRentArrearsGround(req);
            return !rentArrears;
          },
          nextStep: 'non-rent-arrears-dispute',
        },
      ],
      previousStep: async (req: Request) => {
        const tenancyStartDateKnown = await isTenancyStartDateKnown(req);
        return tenancyStartDateKnown ? 'tenancy-date-details' : 'tenancy-date-unknown';
      },
    },

    'confirmation-of-notice-date-when-provided': {
      routes: [
        {
          condition: async (req: Request): Promise<boolean> => {
            const rentArrears = await hasAnyRentArrearsGround(req);
            return rentArrears;
          },
          nextStep: 'rent-arrears-dispute',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const rentArrears = await hasAnyRentArrearsGround(req);
            return !rentArrears;
          },
          nextStep: 'non-rent-arrears-dispute',
        },
      ],
      previousStep: 'confirmation-of-notice-given',
    },
    'confirmation-of-notice-date-when-not-provided': {
      routes: [
        {
          condition: async (req: Request): Promise<boolean> => {
            const rentArrears = await hasAnyRentArrearsGround(req);
            return rentArrears;
          },
          nextStep: 'rent-arrears-dispute',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const rentArrears = await hasAnyRentArrearsGround(req);
            return !rentArrears;
          },
          nextStep: 'non-rent-arrears-dispute',
        },
      ],
      previousStep: 'confirmation-of-notice-given',
    },
    'rent-arrears-dispute': {
      defaultNext: 'counter-claim',
      previousStep: (req: Request) => getStepBeforeDisputePages(req),
      routes: [
        {
          condition: (req: Request): Promise<boolean> => hasOnlyRentArrearsGrounds(req),
          nextStep: 'counter-claim',
        },
        {
          condition: async (req: Request): Promise<boolean> => !(await hasOnlyRentArrearsGrounds(req)),
          nextStep: 'non-rent-arrears-dispute',
        },
      ],
    },
    'non-rent-arrears-dispute': {
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
      previousStep: 'repayments-agreed',
      defaultNext: 'your-household-and-circumstances',
    },
    'your-household-and-circumstances': {
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
          condition: async (req: Request): Promise<boolean> => {
            return !(await isFinanceDetailsProvided(req));
          },
          nextStep: 'other-considerations',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const provided = await isFinanceDetailsProvided(req);
            return provided;
          },
          nextStep: 'what-regular-income-do-you-receive',
        },
      ],
      defaultNext: 'what-regular-income-do-you-receive',
    },
    'what-regular-income-do-you-receive': {
      previousStep: 'income-and-expenses',
      routes: [
        {
          condition: async (req: Request): Promise<boolean> => {
            const selected = await isUniversalCreditSelected(req);
            return selected;
          },
          nextStep: 'priority-debts',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            return !(await isUniversalCreditSelected(req));
          },
          nextStep: 'have-you-applied-for-universal-credit',
        },
      ],
      defaultNext: 'have-you-applied-for-universal-credit',
    },
    'have-you-applied-for-universal-credit': {
      previousStep: 'what-regular-income-do-you-receive',
      defaultNext: 'priority-debts',
    },
    'priority-debts': {
      previousStep: async (req: Request): Promise<string> => {
        const selectedUniversalCredit = await hasSelectedUniversalCredit(req);
        return selectedUniversalCredit ? 'what-regular-income-do-you-receive' : 'have-you-applied-for-universal-credit';
      },
      defaultNext: 'priority-debt-details',
    },
    'priority-debt-details': {
      previousStep: 'priority-debts',
      defaultNext: 'what-other-regular-expenses-do-you-have',
    },
    'what-other-regular-expenses-do-you-have': {
      previousStep: 'priority-debt-details',
      defaultNext: 'other-considerations',
    },
    'other-considerations': {
      previousStep: async (req: Request): Promise<string> => {
        const fromIncomeExpenditure = await isFromIncomeAndExpenditure(req);
        return fromIncomeExpenditure ? 'income-and-expenses' : 'what-other-regular-expenses-do-you-have';
      },
      defaultNext: 'upload-docs',
    },
    'upload-docs': {
      previousStep: 'other-considerations',
      defaultNext: 'end-now',
    },
  },
};
