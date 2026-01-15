import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';


//TODO need to add logic to check if defendant name is known from CCD case data
const isDefendantNameKnown = (): boolean => {
  return false;
};
export const flowConfig: JourneyFlowConfig = {
  basePath: '/respond-to-claim',
  journeyName: 'respondToClaim',
  stepOrder: [
    'start-now',
    'free-legal-advice',
    'defendant-name-confirmation',
    'defendant-name-capture',
    'postcode-finder',
  ],
  steps: {
    'start-now': {
      defaultNext: 'free-legal-advice',
    },
    'free-legal-advice': {
      routes: [
        {
          // Route to defendant name confirmation if defendant is known
          condition: () => isDefendantNameKnown(),
          nextStep: 'defendant-name-confirmation',
        },
        {
          // Route to defendant name capture if defendant is unknown
          condition: () => !isDefendantNameKnown(),
          nextStep: 'defendant-name-capture',
        },
      ],
      defaultNext: 'defendant-name-capture',
    },
    'defendant-name-confirmation': {
      defaultNext: 'postcode-finder',
    },
    'defendant-name-capture': {
      defaultNext: 'postcode-finder',
    },
  },
};
