import type { JourneyFlowConfig } from '../interfaces/stepFlow.interface';

import type { StepDefinition } from './../interfaces/stepFormData.interface';
import { respondToClaimFlowConfig } from './respond-to-claim/flow.config';
import { step as postcodeFinder } from './respond-to-claim/postcode-finder';
import { step as freeLegalAdvice } from './respond-to-claim/free-legal-advice';
import { step as startNow } from './respond-to-claim/start-now';
import { step as applicationSubmitted } from './userJourney/application-submitted';
import { step as enterAddress } from './userJourney/enter-address';
import { step as enterUserDetails } from './userJourney/enter-user-details';
import { userJourneyFlowConfig } from './userJourney/flow.config';
import { step as summary } from './userJourney/summary';

const userJourneyStepRegistry: Record<string, StepDefinition> = {
  'enter-user-details': enterUserDetails,
  'enter-address': enterAddress,
  summary,
  'application-submitted': applicationSubmitted,
};

const respondToClaimStepRegistry: Record<string, StepDefinition> = {
  'start-now': startNow,
  'free-legal-advice': freeLegalAdvice,
  'postcode-finder': postcodeFinder,
};

const allStepRegistries: Record<string, { config: JourneyFlowConfig; registry: Record<string, StepDefinition> }> = {
  [userJourneyFlowConfig.basePath!]: {
    config: userJourneyFlowConfig,
    registry: userJourneyStepRegistry,
  },
  [respondToClaimFlowConfig.basePath!]: {
    config: respondToClaimFlowConfig,
    registry: respondToClaimStepRegistry,
  },
};

export const stepsWithContent: StepDefinition[] = [
  ...userJourneyFlowConfig.stepOrder
    .map((stepName: string) => userJourneyStepRegistry[stepName])
    .filter((step: StepDefinition | undefined): step is StepDefinition => step !== undefined),
  ...respondToClaimFlowConfig.stepOrder
    .map((stepName: string) => respondToClaimStepRegistry[stepName])
    .filter((step: StepDefinition | undefined): step is StepDefinition => step !== undefined),
];

export const protectedSteps: StepDefinition[] = stepsWithContent.filter(step => {
  const flowConfig = getFlowConfigForStep(step);
  if (!flowConfig) {
    return true;
  }
  const stepConfig = flowConfig.steps[step.name];
  return stepConfig?.requiresAuth !== false;
});

export function getFlowConfigForStep(step: StepDefinition): JourneyFlowConfig | null {
  for (const [basePath, { config }] of Object.entries(allStepRegistries)) {
    if (step.url.startsWith(basePath)) {
      return config;
    }
  }
  return null;
}

export function getStepRegistryForStep(step: StepDefinition): Record<string, StepDefinition> | null {
  for (const [basePath, { registry }] of Object.entries(allStepRegistries)) {
    if (step.url.startsWith(basePath)) {
      return registry;
    }
  }
  return null;
}
