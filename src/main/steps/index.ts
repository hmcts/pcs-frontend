import type { JourneyFlowConfig } from '../interfaces/stepFlow.interface';

import type { StepDefinition } from './../interfaces/stepFormData.interface';
import { respondToClaimFlowConfig } from './respond-to-claim/flow.config';
import { step as freeLegalAdvice } from './respond-to-claim/free-legal-advice';
import { step as postcodeFinder } from './respond-to-claim/postcode-finder';
import { step as startNow } from './respond-to-claim/start-now';
import { step as applicationSubmitted } from './userJourney/application-submitted';
import { step as enterAddress } from './userJourney/enter-address';
import { step as enterAge } from './userJourney/enter-age';
import { step as enterContactPreferences } from './userJourney/enter-contact-preferences';
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
  'enter-contact-preferences': enterContactPreferences,
  'enter-user-details': enterUserDetails,
  'enter-address': enterAddress,
  summary,
  'application-submitted': applicationSubmitted,
};

// Respond to Claim step registry
const respondToClaimStepRegistry: Record<string, StepDefinition> = {
  'start-now': startNow,
  'postcode-finder': postcodeFinder,
  'free-legal-advice': freeLegalAdvice,
};

// Journey registry - add new journeys here
export const journeyRegistry: Record<string, JourneyConfig> = {
  userJourney: {
    name: 'userJourney',
    flowConfig: userJourneyFlowConfig,
    stepRegistry: userJourneyStepRegistry,
  },
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
