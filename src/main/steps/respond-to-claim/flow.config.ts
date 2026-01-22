import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';

export const RESPOND_TO_CLAIM_ROUTE = '/respond-to-claim';

export const flowConfig: JourneyFlowConfig = {
  basePath: RESPOND_TO_CLAIM_ROUTE,
  journeyName: 'respondToClaim',
  stepOrder: [
    'start-now',
    'postcode-finder',
    'free-legal-advice',
    'contact-preferences-telephone',
    'contact-preferences-text-message',
    'interstitial',
  ],
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
    'contact-preferences-telephone': {
      defaultNext: 'contact-preferences-text-message',
    },
    'contact-preferences-text-message': {
      defaultNext: 'interstitial',
    },
    interstitial: {
      defaultNext: undefined,
    },
  },
};
