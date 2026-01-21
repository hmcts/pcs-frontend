import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const RESPOND_TO_CLAIM_ROUTE = '/respond-to-claim';

export const flowConfig: JourneyFlowConfig = {
  basePath: RESPOND_TO_CLAIM_ROUTE,
  journeyName: 'respondToClaim',
  stepOrder: ['start-now', 'postcode-finder', 'contact-preferences', 'free-legal-advice'],
  steps: {
    'start-now': {
      defaultNext: 'postcode-finder',
    },
    'postcode-finder': {
      defaultNext: 'contact-preferences',
    },
    'contact-preferences': {
      defaultNext: 'free-legal-advice',
    },
    'free-legal-advice': {
      defaultNext: 'summary',
    },
  },
};
