import type { JourneyFlowConfig } from '../../interfaces/stepFlow.interface';
import { type Request } from 'express';

import { flowConfig as citizenFlowConfig } from './flow.config';
import { isDefendantNameKnown } from '../utils';

export const professionalFlowConfig: JourneyFlowConfig = {
  ...citizenFlowConfig,
  journeyName: 'respondToClaimProfessional',
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
