import type { Request } from 'express';

import type { JourneyFlowConfig } from '../interfaces/stepFlow.interface';
import type { StepDefinition } from '../interfaces/stepFormData.interface';

import { flowConfig as makeAnApplicationFlowConfig } from './make-an-application/flow.config';
import { stepRegistry as makeAnApplicationStepRegistry } from './make-an-application/stepRegistry';
import { flowConfig as respondToClaimFlowConfig } from './respond-to-claim/flow.config';
import { legalrepFlowConfig as respondToClaimLegalrepFlowConfig } from './respond-to-claim/legalrep.flow.config';
import { stepRegistry as respondToClaimStepRegistry } from './respond-to-claim/stepRegistry';
import { getUserType } from './utils';

export interface ResolvedJourneyConfig {
  flowConfig: JourneyFlowConfig;
  stepRegistry: Record<string, StepDefinition>;
}

export interface JourneyConfig {
  name: string;
  default: ResolvedJourneyConfig;
  legalrep?: ResolvedJourneyConfig;
}

// Journey registry - add new journeys here
export const journeyRegistry: Record<string, JourneyConfig> = {
  respondToClaim: {
    name: 'respondToClaim',
    default: {
      flowConfig: respondToClaimFlowConfig,
      stepRegistry: respondToClaimStepRegistry,
    },
    legalrep: {
      flowConfig: respondToClaimLegalrepFlowConfig,
      stepRegistry: respondToClaimStepRegistry,
    },
  },
  makeAnApplication: {
    name: 'makeAnApplication',
    flowConfig: makeAnApplicationFlowConfig,
    stepRegistry: makeAnApplicationStepRegistry,
  },
};

function getJourneyConfigForRequest(journeyName: string, req?: Request): ResolvedJourneyConfig | undefined {
  const journey = journeyRegistry[journeyName];
  if (!journey) {
    return undefined;
  }

  const userType = req ? getUserType(req) : 'citizen';

  if (userType === 'legalrep' && journey.legalrep) {
    return journey.legalrep;
  }

  return journey.default;
}

function getRegistrationStepNames(journey: JourneyConfig): string[] {
  const stepNames = new Set<string>([
    ...journey.default.flowConfig.stepOrder,
    ...Object.keys(journey.default.stepRegistry),
    ...(journey.legalrep?.flowConfig.stepOrder ?? []),
    ...Object.keys(journey.legalrep?.stepRegistry ?? {}),
  ]);

  return Array.from(stepNames);
}

export function getFlowConfigForJourney(journeyName: string, req?: Request): JourneyFlowConfig | undefined {
  return getJourneyConfigForRequest(journeyName, req)?.flowConfig;
}

export function getStepForJourney(journeyName: string, stepName: string, req?: Request): StepDefinition | undefined {
  return getJourneyConfigForRequest(journeyName, req)?.stepRegistry[stepName];
}

// Helper function to get steps for a specific journey
export function getStepsForJourney(journeyName: string, req?: Request): StepDefinition[] {
  const journey = journeyRegistry[journeyName];
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

      return journey.default.stepRegistry[stepName] ?? journey.legalrep?.stepRegistry[stepName];
    })
    .filter((step: StepDefinition | undefined): step is StepDefinition => step !== undefined);
}
