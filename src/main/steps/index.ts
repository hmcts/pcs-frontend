import type { StepDefinition } from './../interfaces/stepFormData.interface';
import { step as applicationSubmitted } from './userJourney/application-submitted';
import { step as enterAddress } from './userJourney/enter-address';
import { step as enterUserDetails } from './userJourney/enter-user-details';
import { userJourneyFlowConfig } from './userJourney/flow.config';
import { step as summary } from './userJourney/summary';

// Step registry - maps step names to step definitions
const stepRegistry: Record<string, StepDefinition> = {
  'enter-user-details': enterUserDetails,
  'enter-address': enterAddress,
  summary,
  'application-submitted': applicationSubmitted,
};

/**
 * Get steps in the order defined by the flow configuration
 */
export const stepsWithContent: StepDefinition[] = userJourneyFlowConfig.stepOrder
  .map(stepName => stepRegistry[stepName])
  .filter((step): step is StepDefinition => step !== undefined);

/**
 * Get protected steps (steps that require authentication) from flow configuration
 * Defaults to true if requiresAuth is not specified
 */
export const protectedSteps: StepDefinition[] = stepsWithContent.filter(step => {
  const stepConfig = userJourneyFlowConfig.steps[step.name];
  // Default to true if requiresAuth is undefined/null
  return stepConfig?.requiresAuth !== false;
});
