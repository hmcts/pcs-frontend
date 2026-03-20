import { type Request } from 'express';

import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';
import {
  getPreviousPageForArrears,
  isDefendantNameKnown,
  isNoticeDateProvided,
  isNoticeServed,
  isRentArrearsClaim,
  isTenancyStartDateKnown,
  isWelshProperty,
} from '../utils';

export const RESPOND_TO_CLAIM_ROUTE = '/case/:caseReference/respond-to-claim';

export const flowConfig: JourneyFlowConfig = {
  basePath: RESPOND_TO_CLAIM_ROUTE,
  journeyName: 'respondToClaim',
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
    'tenancy-type-details',
    'tenancy-date-unknown',
    'tenancy-date-details',
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
    'income-and-expenditure',
    'what-regular-income-do-you-receive',
    'have-you-applied-for-universal-credit',
    'priority-debts',
    'priority-debt-details',
    'what-other-regular-expenses-do-you-have',
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
          condition: async (req: Request) =>
            req.session?.formData?.['contact-preferences-telephone']?.contactByTelephone === 'yes',
          nextStep: 'contact-preferences-text-message',
        },
        {
          condition: async (req: Request) =>
            req.session?.formData?.['contact-preferences-telephone']?.contactByTelephone === 'no',
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
    },
    'landlord-licensed': {
      defaultNext: 'tenancy-type-details',
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
      previousStep: async (req: Request, formData: Record<string, unknown>) => {
        // Check formData to see which path was actually taken
        // This honors the actual journey path even if case data changes mid-journey
        if ('landlord-registered' in formData) {
          return 'landlord-registered';
        }

        // Fallback: check current case data for new journeys

        const welshProperty = await isWelshProperty(req);
        if (welshProperty) {
          return 'landlord-registered';
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
            const rentArrears = await isRentArrearsClaim(req);
            return rentArrears;
          },
          nextStep: 'rent-arrears-dispute',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const rentArrears = await isRentArrearsClaim(req);
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
            const rentArrears = await isRentArrearsClaim(req);
            return rentArrears;
          },
          nextStep: 'rent-arrears-dispute',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const rentArrears = await isRentArrearsClaim(req);
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
          condition: async (req: Request): Promise<boolean> => {
            const confirmed = req.session?.formData?.['confirmation-of-notice-given']?.confirmNoticeGiven === 'yes';
            if (!confirmed) {
              return false;
            }
            const noticeDateProvided = await isNoticeDateProvided(req);
            return noticeDateProvided;
          },
          nextStep: 'confirmation-of-notice-date-when-provided',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const confirmed = req.session?.formData?.['confirmation-of-notice-given']?.confirmNoticeGiven === 'yes';
            if (!confirmed) {
              return false;
            }
            const noticeDateProvided = await isNoticeDateProvided(req);
            return !noticeDateProvided;
          },
          nextStep: 'confirmation-of-notice-date-when-not-provided',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const confirmNoticeGiven = req.session?.formData?.['confirmation-of-notice-given']?.confirmNoticeGiven;
            if (confirmNoticeGiven !== 'no' && confirmNoticeGiven !== 'imNotSure') {
              return false;
            }
            const rentArrears = await isRentArrearsClaim(req);
            return rentArrears;
          },
          nextStep: 'rent-arrears-dispute',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const confirmNoticeGiven = req.session?.formData?.['confirmation-of-notice-given']?.confirmNoticeGiven;
            if (confirmNoticeGiven !== 'no' && confirmNoticeGiven !== 'imNotSure') {
              return false;
            }
            const rentArrears = await isRentArrearsClaim(req);
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
            const rentArrears = await isRentArrearsClaim(req);
            return rentArrears;
          },
          nextStep: 'rent-arrears-dispute',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const rentArrears = await isRentArrearsClaim(req);
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
            const rentArrears = await isRentArrearsClaim(req);
            return rentArrears;
          },
          nextStep: 'rent-arrears-dispute',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const rentArrears = await isRentArrearsClaim(req);
            return !rentArrears;
          },
          nextStep: 'non-rent-arrears-dispute',
        },
      ],
      previousStep: 'confirmation-of-notice-given',
    },
    'rent-arrears-dispute': {
      defaultNext: 'counter-claim',
      previousStep: req => getPreviousPageForArrears(req),
    },
    'non-rent-arrears-dispute': {
      defaultNext: 'counter-claim',
      previousStep: req => getPreviousPageForArrears(req),
    },
    'counter-claim': {
      defaultNext: 'payment-interstitial',
      previousStep: async (req: Request) => {
        const rentArrearsClaim = await isRentArrearsClaim(req);
        if (rentArrearsClaim) {
          return 'rent-arrears-dispute';
        }
        return 'non-rent-arrears-dispute';
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
      previousStep: 'repayments-made',
      routes: [
        {
          condition: async (
            req: Request,
            _formData: Record<string, unknown>,
            currentStepData: Record<string, unknown>
          ): Promise<boolean> => {
            const choseNo = currentStepData?.confirmRepaymentsAgreed === 'no';
            if (!choseNo) {
              return false;
            }
            return isRentArrearsClaim(req);
          },
          nextStep: 'installment-payments',
        },
      ],
      defaultNext: 'your-household-and-circumstances',
    },
    'installment-payments': {
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
      previousStep: async (req: Request, formData: Record<string, unknown>) => {
        const repaymentsAgreed = formData['repayments-agreed'] as Record<string, unknown> | undefined;
        const confirmRepaymentsAgreed = repaymentsAgreed?.confirmRepaymentsAgreed;

        // If user did not choose "No" on repayments-agreed, route always comes directly from that step.
        // This also protects against stale installment data in session from earlier journey attempts.
        if (confirmRepaymentsAgreed !== 'no') {
          return 'repayments-agreed';
        }

        // "No" only routes through installment steps for rent arrears cases.
        const rentArrearsClaim = await isRentArrearsClaim(req);
        if (!rentArrearsClaim) {
          return 'repayments-agreed';
        }

        const installmentPayments = formData['installment-payments'] as Record<string, unknown> | undefined;
        const confirmInstallmentOffer = installmentPayments?.confirmInstallmentOffer;

        if (confirmInstallmentOffer === 'yes') {
          return 'how-much-afford-to-pay';
        }
        if (confirmInstallmentOffer === 'no') {
          return 'installment-payments';
        }

        // Defensive fallback for partially-complete sessions.
        return 'repayments-agreed';
      },
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
      defaultNext: 'income-and-expenditure',
    },
    'income-and-expenditure': {
      previousStep: 'exceptional-hardship',
      defaultNext: 'what-regular-income-do-you-receive',
    },
    'what-regular-income-do-you-receive': {
      previousStep: 'income-and-expenditure',
      defaultNext: 'have-you-applied-for-universal-credit',
    },
    'have-you-applied-for-universal-credit': {
      previousStep: 'what-regular-income-do-you-receive',
      defaultNext: 'priority-debts',
    },
    'priority-debts': {
      previousStep: 'have-you-applied-for-universal-credit',
      defaultNext: 'priority-debt-details',
    },
    'priority-debt-details': {
      previousStep: 'priority-debts',
      defaultNext: 'what-other-regular-expenses-do-you-have',
    },
    'what-other-regular-expenses-do-you-have': {
      previousStep: 'priority-debt-details',
      defaultNext: 'end-now',
    },
  },
};
