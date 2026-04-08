import { type Request } from 'express';

import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';
import { isDefendantNameKnown } from '../utils';

import { flowConfig as citizenFlowConfig } from './flow.config';

export const legalrepFlowConfig: JourneyFlowConfig = {
  ...citizenFlowConfig,
  journeyName: 'respondToClaimLegalrep',
  stepOrder: citizenFlowConfig.stepOrder.filter(stepName => stepName !== 'free-legal-advice'),
  steps: {
    ...citizenFlowConfig.steps,
    'start-now': {
      routes: [
        {
          condition: async (req: Request) => isDefendantNameKnown(req),
          nextStep: 'defendant-name-confirmation',
        },
        {
          condition: async (req: Request) => !isDefendantNameKnown(req),
          nextStep: 'defendant-name-capture',
        },
      ],
      defaultNext: 'defendant-name-capture',
    },
  },
};
