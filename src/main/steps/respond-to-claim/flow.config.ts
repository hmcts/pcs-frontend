import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const flowConfig: JourneyFlowConfig = {
  basePath: '/respond-to-claim',
  journeyName: 'respondToClaim',
  stepOrder: ['start-now', 'postcode-finder', 'free-legal-advice', 'contact-preferences', 'contact-preferences-text-message'],
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
    'contact-preferences': {
      defaultNext: 'contact-preferences-text-message',
        },
    'contact-preferences-text-message': {
      defaultNext: '',
         }
  },
};
