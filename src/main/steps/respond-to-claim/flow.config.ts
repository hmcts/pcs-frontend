import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const respondToClaimFlowConfig: JourneyFlowConfig = {
  basePath: '/respond-to-claim',
  stepOrder: ['start-now'],
  steps: {
    'start-now': {
      defaultNext: 'next-page', //TODO: Add next page
    },
  },
};
