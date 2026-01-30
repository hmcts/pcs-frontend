import { type Request } from 'express';

import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';
import { isDefendantNameKnown } from '../utils/isDefendantNameKnown';
import { isNoticeDateProvided } from '../utils/isNoticeDateProvided';
import { isRentArrearsClaim } from '../utils/isRentArrearsClaim';

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
    'confirmation-of-notice-given',
    'confirmation-of-notice-date-when-provided',
    'confirmation-of-notice-date-when-not-provided',
    'rent-arrears-dispute',
    'non-rent-arrears-dispute',
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
      defaultNext: 'confirmation-of-notice-given',
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
            const confirmed = req.session?.formData?.['confirmation-of-notice-given']?.confirmNoticeGiven !== 'yes';
            if (!confirmed) {
              return false;
            }
            const rentArrears = await isRentArrearsClaim(req);
            return rentArrears;
          },
          nextStep: 'rent-arrears-dispute',
        },
        {
          condition: async (req: Request): Promise<boolean> => {
            const confirmed = req.session?.formData?.['confirmation-of-notice-given']?.confirmNoticeGiven !== 'yes';
            if (!confirmed) {
              return false;
            }
            const rentArrears = await isRentArrearsClaim(req);
            return !rentArrears;
          },
          nextStep: 'non-rent-arrears-dispute',
        },
      ],
      previousStep: 'postcode-finder',
    },

    'confirmation-of-notice-date-when-provided': {
      routes: [
        {
          condition: async (req: Request) => isRentArrearsClaim(req),
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
          condition: async (req: Request) => isRentArrearsClaim(req),
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
      defaultNext: '',
    },
    'non-rent-arrears-dispute': {
      defaultNext: '',
    },
  },
};
