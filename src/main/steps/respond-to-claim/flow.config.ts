import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const respondToClaimFlowConfig: JourneyFlowConfig = {
  basePath: '/respond-to-claim',
  journeyName: 'respondToClaim',
  stepOrder: ['start-now', 'postcode-finder', 'free-legal-advice'],
  steps: {
    'start-now': {
      defaultNext: 'postcode-finder',
    },
    'postcode-finder': {
      defaultNext: 'free-legal-advice',
    },
    'free-legal-advice': {
      defaultNext: 'legal-advice',
    },
  },
};
