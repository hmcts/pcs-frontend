import type { StepDefinition } from './../interfaces/stepFormData.interface';
import { step as applicationSubmitted } from './userJourney/application-submitted';
import { step as enterAddress } from './userJourney/enter-address';
import { step as enterAge } from './userJourney/enter-age';
import { step as enterGround } from './userJourney/enter-ground';
import { step as enterUserDetails } from './userJourney/enter-user-details';
import { userJourneyFlowConfig } from './userJourney/flow.config';
import { step as ineligible } from './userJourney/ineligible';
import { step as summary } from './userJourney/summary';

const stepRegistry: Record<string, StepDefinition> = {
  'enter-age': enterAge,
  'enter-ground': enterGround,
  ineligible,
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
