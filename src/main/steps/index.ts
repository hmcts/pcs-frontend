import type { JourneyFlowConfig } from '../interfaces/stepFlow.interface';

import type { StepDefinition } from './../interfaces/stepFormData.interface';
import { step as applicationSubmitted } from './userJourney/application-submitted';
import { step as enterAddress } from './userJourney/enter-address';
import { step as enterAge } from './userJourney/enter-age';
import { step as enterDob } from './userJourney/enter-dob';
import { step as enterGround } from './userJourney/enter-ground';
import { step as enterOtherReason } from './userJourney/enter-other-reason';
import { step as enterUserDetails } from './userJourney/enter-user-details';
import { userJourneyFlowConfig } from './userJourney/flow.config';
import { step as ineligible } from './userJourney/ineligible';
import { step as summary } from './userJourney/summary';

export interface JourneyConfig {
  name: string;
  flowConfig: JourneyFlowConfig;
  stepRegistry: Record<string, StepDefinition>;
}

// User Journey step registry
const userJourneyStepRegistry: Record<string, StepDefinition> = {
  'enter-age': enterAge,
  'enter-dob': enterDob,
  'enter-ground': enterGround,
  'enter-other-reason': enterOtherReason,
  ineligible,
  'enter-user-details': enterUserDetails,
  'enter-address': enterAddress,
  summary,
  'application-submitted': applicationSubmitted,
};

// Journey registry - add new journeys here
export const journeyRegistry: Record<string, JourneyConfig> = {
  userJourney: {
    name: 'userJourney',
    flowConfig: userJourneyFlowConfig,
    stepRegistry: userJourneyStepRegistry,
  },
  // Add more journeys here as they are created
  // respondToClaim: {
  //   name: 'respondToClaim',
  //   flowConfig: respondToClaimFlowConfig,
  //   stepRegistry: respondToClaimStepRegistry,
  // },
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

// Get flow config for a specific journey
export function getFlowConfigForJourney(journeyName: string): JourneyFlowConfig | null {
  return journeyRegistry[journeyName]?.flowConfig || null;
}

// Get all steps from all journeys (for backward compatibility)
export const stepsWithContent: StepDefinition[] = Object.values(journeyRegistry).flatMap(journey =>
  getStepsForJourney(journey.name)
);

// Get protected steps from all journeys (for backward compatibility)
export const protectedSteps: StepDefinition[] = stepsWithContent.filter(step => {
  // Find which journey this step belongs to
  for (const journey of Object.values(journeyRegistry)) {
    if (journey.stepRegistry[step.name]) {
      const stepConfig = journey.flowConfig.steps[step.name];
      return stepConfig?.requiresAuth !== false;
    }
  }
  return true; // Default to protected if we can't find the journey
});
