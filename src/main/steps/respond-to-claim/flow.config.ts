import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const respondToClaimFlowConfig: JourneyFlowConfig = {
  basePath: '/respond-to-claim',
  journeyName: 'respondToClaim',
  stepOrder: ['start-now', 'free-legal-advice', 'postcode-finder'],
  steps: {
    'start-now': {
      defaultNext: 'free-legal-advice',
    },
    'free-legal-advice': {
      defaultNext: 'legal-advice',
    },
       'postcode-finder': {
      defaultNext: 'next-page',
  },
};
