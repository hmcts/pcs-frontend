import type { JourneyFlowConfig } from '../interfaces/stepFlow.interface';
import type { StepDefinition } from '../interfaces/stepFormData.interface';

import { flowConfig as respondToClaimFlowConfig } from './respond-to-claim/flow.config';
import { stepRegistry as respondToClaimStepRegistry } from './respond-to-claim/stepRegistry';

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
