import { flowConfig as citizenFlowConfig } from './flow.config';

import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

export const legalrepFlowConfig: JourneyFlowConfig = {
  ...citizenFlowConfig,
  journeyName: 'respondToClaimLegalrep',
  stepOrder: citizenFlowConfig.stepOrder.filter(step => step !== 'free-legal-advice'),
};
