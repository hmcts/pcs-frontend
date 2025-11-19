import type { StepDefinition } from './../interfaces/stepFormData.interface';
import { step as applicationSubmitted } from './userJourney/application-submitted';
import { step as enterAddress } from './userJourney/enter-address';
import { step as enterUserDetails } from './userJourney/enter-user-details';
import { userJourneyFlowConfig } from './userJourney/flow.config';
import { step as summary } from './userJourney/summary';

const stepRegistry: Record<string, StepDefinition> = {
  'enter-user-details': enterUserDetails,
  'enter-address': enterAddress,
  summary,
  'application-submitted': applicationSubmitted,
};

export const stepsWithContent: StepDefinition[] = userJourneyFlowConfig.stepOrder
  .map((stepName: string) => stepRegistry[stepName])
  .filter((step: StepDefinition | undefined): step is StepDefinition => step !== undefined);

export const protectedSteps: StepDefinition[] = stepsWithContent.filter(step => {
  const stepConfig = userJourneyFlowConfig.steps[step.name];
  return stepConfig?.requiresAuth !== false;
});
