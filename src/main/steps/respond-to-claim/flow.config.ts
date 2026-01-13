import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const flowConfig: JourneyFlowConfig = {
  basePath: '/respond-to-claim',
  journeyName: 'respondToClaim',
  stepOrder: ['start-now', 'free-legal-advice', 'defendant-name-confirmation', 'defendant-name-capture', 'postcode-finder'],
  steps: {
    'start-now': {
      defaultNext: 'free-legal-advice',
    },
    'free-legal-advice': {
      routes: [
        {
          // Route to defendant name confirmation if defendant is known
          // TODO: Check if defendant is known
          condition: (): boolean => false,
          nextStep: 'defendant-name-confirmation',
        },
        {
          // Route to defendant name capture if defendant is unknown (default)
          condition: (): boolean => true,
          nextStep: 'defendant-name-capture',
        },
      ],
    },
    'defendant-name-confirmation': {
      defaultNext: 'postcode-finder',
    },
    'defendant-name-capture': {
      defaultNext: 'postcode-finder',
    },
  },
};
