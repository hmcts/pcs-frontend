import { type Request } from 'express';

import { isDefendantNameKnown } from '../utils';

import { flowConfig as citizenFlowConfig } from './flow.config';

import type { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

export const legalrepFlowConfig: JourneyFlowConfig = {
  ...citizenFlowConfig,
  journeyName: 'respondToClaimLegalrep',
  stepOrder: citizenFlowConfig.stepOrder.filter(step => step !== 'free-legal-advice'),
  steps: {
    ...citizenFlowConfig.steps,
    'start-now': {
      routes: [
        {
          condition: async (req: Request) => isDefendantNameKnown(req),
          nextStep: 'defendant-name-confirmation',
        },
        {
          condition: async (req: Request) => !(await isDefendantNameKnown(req)),
          nextStep: 'defendant-name-capture',
        },
      ],
      defaultNext: 'defendant-name-capture',
    },
    'defendant-name-confirmation': {
      ...citizenFlowConfig.steps['defendant-name-confirmation'],
      previousStep: 'start-now',
    },
    'defendant-name-capture': {
      ...citizenFlowConfig.steps['defendant-name-capture'],
      previousStep: 'start-now',
    },
  },
};
