import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const flowConfig: JourneyFlowConfig = {
  basePath: '/respond-to-claim',
  journeyName: 'respondToClaim',
  stepOrder: ['start-now', 'free-legal-advice', 'defendant-name-confirmation', 'postcode-finder'],
  steps: {
    'start-now': {
      defaultNext: 'free-legal-advice',
    },
    'free-legal-advice': {
      defaultNext: 'defendant-name-confirmation',
    },
    'defendant-name-confirmation': {
      defaultNext: 'postcode-finder',
    },
  },
};
