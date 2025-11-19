import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const userJourneyFlowConfig: JourneyFlowConfig = {
  basePath: '/steps/user-journey',
  stepOrder: ['enter-user-details', 'enter-address', 'summary', 'application-submitted'],
  steps: {
    'enter-user-details': {
      defaultNext: 'enter-address',
    },
    'enter-address': {
      dependencies: ['enter-user-details'],
      defaultNext: 'summary',
    },
    summary: {
      dependencies: ['enter-user-details', 'enter-address'],
      defaultNext: 'application-submitted',
    },
    'application-submitted': {
      dependencies: ['summary'],
    },
  },
};
