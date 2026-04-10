import { flowConfig as makeAnApplicationFlowConfig } from './make-an-application/flow.config';
import { stepRegistry as makeAnApplicationStepRegistry } from './make-an-application/stepRegistry';
import { flowConfig as respondToClaimFlowConfig } from './respond-to-claim/flow.config';
import { stepRegistry as respondToClaimStepRegistry } from './respond-to-claim/stepRegistry';

import type { JourneyFlowConfig } from '@interfaces/stepFlow.interface';
import type { StepDefinition } from '@interfaces/stepFormData.interface';

export interface JourneyConfig {
  name: string;
  flowConfig: JourneyFlowConfig;
  stepRegistry: Record<string, StepDefinition>;
}
// Journey registry - add new journeys here
export const journeyRegistry: Record<string, JourneyConfig> = {
  respondToClaim: {
    name: 'respondToClaim',
    flowConfig: respondToClaimFlowConfig,
    stepRegistry: respondToClaimStepRegistry,
  },
  makeAnApplication: {
    name: 'makeAnApplication',
    flowConfig: makeAnApplicationFlowConfig,
    stepRegistry: makeAnApplicationStepRegistry,
  },
};

// Helper function to get steps for a specific journey
export function getStepsForJourney(journeyName: string): StepDefinition[] {
  const journey = journeyRegistry[journeyName];
  if (!journey) {
    return [];
  }

  return journey.flowConfig.stepOrder
    .map((stepName: string) => journey.stepRegistry[stepName])
    .filter((step: StepDefinition | undefined): step is StepDefinition => step !== undefined);
}
