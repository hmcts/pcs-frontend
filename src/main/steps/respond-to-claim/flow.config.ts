import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const respondToClaimFlowConfig: JourneyFlowConfig = {
  basePath: '/respond-to-claim',
  stepOrder: ['start-now', 'postcode-finder'],
  steps: {
    'start-now': {
      defaultNext: 'postcode-finder',
    },
    'postcode-finder': {
      defaultNext: 'next-page', //TODO: Add next page
    },
  },
};
