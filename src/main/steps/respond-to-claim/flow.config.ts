import { type Request } from 'express';

import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';
import { isDefendantNameKnown, isWelshProperty } from '../utils';

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
    'contact-preferences',
    'contact-preferences-telephone',
    'contact-preferences-text-message',
    'dispute-claim-interstitial',
    'landlord-registered',
    'tenancy-details',
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
      defaultNext: 'contact-preferences',
    },
    'contact-preferences': {
      defaultNext: 'contact-preferences-telephone',
    },
    'contact-preferences-telephone': {
      defaultNext: 'contact-preferences-text-message',
    },
    'contact-preferences-text-message': {
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
      defaultNext: 'end-now',
    },
    'tenancy-details': {
      defaultNext: 'end-now',
    },
  },
};
