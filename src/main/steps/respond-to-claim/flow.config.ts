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
    'postcode-finder',
    'dispute-claim-interstitial',
    'landlord-registered',
    'tenancy-details',
    'confirmation-of-notice-given',
    'confirmation-of-notice-date-when-provided',
    'confirmation-of-notice-date-when-not-provided',
    'rent-arrears-dispute',
    'non-rent-arrears-dispute',
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
      defaultNext: 'postcode-finder',
    },
    'postcode-finder': {
      previousStep: 'defendant-date-of-birth',
      defaultNext: 'contact-preferences',
    },
    'contact-preferences': {
      previousStep: 'postcode-finder',
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
      defaultNext: 'end-now',
      previousStep: req => getPreviousPageForArrears(req),
    },

    'non-rent-arrears-dispute': {
      defaultNext: 'end-now',
      previousStep: req => getPreviousPageForArrears(req),
    },
  },
};
