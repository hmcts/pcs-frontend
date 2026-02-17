import { type Request } from 'express';

import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';
import {
  getPreviousPageForArrears,
  isDefendantNameKnown,
  isNoticeDateProvided,
  isNoticeServed,
  isRentArrearsClaim,
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
    'correspondence-address',
    'dispute-claim-interstitial',
    'landlord-registered',
    'tenancy-details',
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
    'contact-preferences',
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
          condition: async (req: Request) => !isDefendantNameKnown(req),
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
      previousStep: formData =>
        'defendant-name-confirmation' in formData ? 'defendant-name-confirmation' : 'defendant-name-capture',
      defaultNext: 'correspondence-address',
    },
    'correspondence-address': {
      previousStep: 'defendant-date-of-birth',
      defaultNext: 'contact-preferences',
    },
    'contact-preferences': {
      previousStep: 'correspondence-address',
      defaultNext: 'dispute-claim-interstitial',
    },
    'dispute-claim-interstitial': {
      routes: [
        {
          // Route to defendant name confirmation if defendant is known
          condition: async (req: Request) => isWelshProperty(req),
          nextStep: 'landlord-registered',
        },
        {
          // Route to defendant name capture if defendant is unknown
          condition: async (req: Request) => !isWelshProperty(req),
          nextStep: 'tenancy-details',
        },
      ],
      defaultNext: 'tenancy-details',
    },
    'landlord-registered': {
      defaultNext: 'tenancy-details',
    },
    'tenancy-details': {
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
      previousStep: async (req: Request) => {
        const welshProperty = await isWelshProperty(req);
        if (welshProperty) {
          return 'landlord-registered';
        }
        return 'dispute-claim-interstitial';
      },
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
      previousStep: 'tenancy-details',
    },

    'confirmation-of-notice-date-when-provided': {
      routes: [
        {
          condition: async (req: Request): Promise<boolean> => {
            const noticeDateProvided = await isNoticeDateProvided(req);
            const rentArrears = await isRentArrearsClaim(req);
            return noticeDateProvided && rentArrears;
          },
          nextStep: 'rent-arrears-dispute',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const noticeDateProvided = await isNoticeDateProvided(req);
            const rentArrears = await isRentArrearsClaim(req);
            return noticeDateProvided && !rentArrears;
          },
          nextStep: 'non-rent-arrears-dispute',
        },
      ],
    },
    'confirmation-of-notice-date-when-not-provided': {
      routes: [
        {
          condition: async (req: Request): Promise<boolean> => {
            const noticeDateProvided = await isNoticeDateProvided(req);
            const rentArrears = await isRentArrearsClaim(req);
            return !noticeDateProvided && rentArrears;
          },
          nextStep: 'rent-arrears-dispute',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const noticeDateProvided = await isNoticeDateProvided(req);
            const rentArrears = await isRentArrearsClaim(req);
            return !noticeDateProvided && !rentArrears;
          },
          nextStep: 'non-rent-arrears-dispute',
        },
      ],
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
      defaultNext: 'your-household-and-circumstances',
    },
    'your-household-and-circumstances': {
      previousStep: 'repayments',
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
    'rent-arrears': {
      defaultNext: 'end-now',
    },
  },
};
