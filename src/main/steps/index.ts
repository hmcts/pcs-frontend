import type { Request } from 'express';

import type { JourneyFlowConfig } from '../interfaces/stepFlow.interface';
import type { StepDefinition } from '../interfaces/stepFormData.interface';

import { flowConfig as respondToClaimFlowConfig } from './respond-to-claim/flow.config';
import { professionalFlowConfig as respondToClaimProfessionalFlowConfig } from './respond-to-claim/professional.flow.config';
import { stepRegistry as respondToClaimStepRegistry } from './respond-to-claim/stepRegistry';
import { isProfessionalUser } from './utils';

export interface ResolvedJourneyConfig {
  flowConfig: JourneyFlowConfig;
  stepRegistry: Record<string, StepDefinition>;
}

export interface JourneyConfig {
  name: string;
  default: ResolvedJourneyConfig;
  professional?: ResolvedJourneyConfig;
}

// Journey registry - add new journeys here
export const journeyRegistry: Record<string, JourneyConfig> = {
  respondToClaim: {
    name: 'respondToClaim',
    default: {
      flowConfig: respondToClaimFlowConfig,
      stepRegistry: respondToClaimStepRegistry,
    },
    professional: {
      flowConfig: respondToClaimProfessionalFlowConfig,
      stepRegistry: respondToClaimStepRegistry,
    },
  },
};

function getJourneyBaseConfig(journeyName: string): JourneyConfig | undefined {
  return journeyRegistry[journeyName];
}

function getJourneyConfigForRequest(journeyName: string, req?: Request): ResolvedJourneyConfig | undefined {
  const journey = getJourneyBaseConfig(journeyName);
  if (!journey) {
    return undefined;
  }

  if (req && isProfessionalUser(req) && journey.professional) {
    return journey.professional;
  }

  return journey.default;
}

function getRegistrationStepNames(journey: JourneyConfig): string[] {
  const professionalFlowStepOrder = journey.professional?.flowConfig.stepOrder ?? [];
  const professionalStepRegistryKeys = Object.keys(journey.professional?.stepRegistry ?? {});

  const stepNames = new Set<string>([
    ...journey.default.flowConfig.stepOrder,
    ...Object.keys(journey.default.stepRegistry),
    ...professionalFlowStepOrder,
    ...professionalStepRegistryKeys,
  ]);

  return Array.from(stepNames);
}

export function getFlowConfigForJourney(journeyName: string, req?: Request): JourneyFlowConfig | undefined {
  return getJourneyConfigForRequest(journeyName, req)?.flowConfig;
}

export function getStepForJourney(
  journeyName: string,
  stepName: string,
  req?: Request
): StepDefinition | undefined {
  return getJourneyConfigForRequest(journeyName, req)?.stepRegistry[stepName];
}

// Helper function to get steps for a specific journey
export function getStepsForJourney(journeyName: string, req?: Request): StepDefinition[] {
  const journey = getJourneyBaseConfig(journeyName);
  if (!journey) {
    return [];
  }

  const activeJourney = getJourneyConfigForRequest(journeyName, req);
  const stepNames = req && activeJourney ? activeJourney.flowConfig.stepOrder : getRegistrationStepNames(journey);

  return stepNames
    .map(stepName => {
      if (req && activeJourney) {
        return activeJourney.stepRegistry[stepName];
      }

      return journey.default.stepRegistry[stepName] ?? journey.professional?.stepRegistry[stepName];
    })
    .filter((step: StepDefinition | undefined): step is StepDefinition => step !== undefined);
}
