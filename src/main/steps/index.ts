import type { JourneyFlowConfig, StepConfig } from '../interfaces/stepFlow.interface';
import type { StepDefinition } from '../interfaces/stepFormData.interface';

import { flowConfig as respondToClaimFlowConfig } from './respond-to-claim/flow.config';
import { stepRegistry as respondToClaimStepRegistry } from './respond-to-claim/stepRegistry';
import { isDefendantNameKnown } from './utils';

export interface JourneyConfig {
  name: string;
  extends?: string;
  profile?: 'citizen' | 'professional';
  flowConfig?: JourneyFlowConfig;
  flowConfigOverrides?: Partial<Omit<JourneyFlowConfig, 'steps'>> & {
    steps?: Record<string, Partial<StepConfig> | null>;
  };
  translationFolders?: string[];
  stepRegistry?: Record<string, StepDefinition>;
  stepRegistryOverrides?: Record<string, StepDefinition | null>;
}

export interface ResolvedJourneyConfig extends JourneyConfig {
  flowConfig: JourneyFlowConfig;
  stepRegistry: Record<string, StepDefinition>;
}

function cloneStepConfig(config: StepConfig): StepConfig {
  return {
    ...config,
    dependencies: config.dependencies ? [...config.dependencies] : undefined,
    routes: config.routes ? [...config.routes] : undefined,
  };
}

function cloneFlowConfig(flowConfig: JourneyFlowConfig): JourneyFlowConfig {
  return {
    ...flowConfig,
    stepOrder: [...flowConfig.stepOrder],
    steps: Object.fromEntries(
      Object.entries(flowConfig.steps).map(([stepName, config]) => [
        stepName,
        cloneStepConfig(config),
      ])
    ),
  };
}

function normalizeStepRegistry(
  stepRegistry: Record<string, StepDefinition>,
  basePath?: string
): Record<string, StepDefinition> {
  return Object.fromEntries(
    Object.entries(stepRegistry).map(([stepName, step]) => [
      stepName,
      {
        ...step,
        url: basePath ? `${basePath}/${stepName}` : step.url,
      },
    ])
  );
}

function mergeFlowConfig(
  baseConfig: JourneyFlowConfig,
  overrides?: JourneyConfig['flowConfigOverrides']
): JourneyFlowConfig {
  if (!overrides) {
    return cloneFlowConfig(baseConfig);
  }

  const mergedSteps: Record<string, StepConfig> = Object.fromEntries(
    Object.entries(baseConfig.steps).map(([stepName, config]) => [stepName, cloneStepConfig(config)])
  );

  if (overrides.steps) {
    for (const [stepName, stepOverride] of Object.entries(overrides.steps)) {
      if (stepOverride === null) {
        delete mergedSteps[stepName];
        continue;
      }

      const existingConfig = mergedSteps[stepName];
      mergedSteps[stepName] = existingConfig
        ? {
            ...existingConfig,
            ...stepOverride,
            dependencies: stepOverride.dependencies ? [...stepOverride.dependencies] : existingConfig.dependencies,
            routes: stepOverride.routes ? [...stepOverride.routes] : existingConfig.routes,
          }
        : {
            ...stepOverride,
            dependencies: stepOverride.dependencies ? [...stepOverride.dependencies] : undefined,
            routes: stepOverride.routes ? [...stepOverride.routes] : undefined,
          };
    }
  }

  const stepOrder = overrides.stepOrder ? [...overrides.stepOrder] : [...baseConfig.stepOrder];

  return {
    ...cloneFlowConfig(baseConfig),
    ...overrides,
    stepOrder,
    steps: mergedSteps,
  };
}

function mergeStepRegistry(
  baseRegistry: Record<string, StepDefinition>,
  overrides?: JourneyConfig['stepRegistryOverrides']
): Record<string, StepDefinition> {
  const mergedRegistry: Record<string, StepDefinition> = { ...baseRegistry };

  if (!overrides) {
    return mergedRegistry;
  }

  for (const [stepName, stepOverride] of Object.entries(overrides)) {
    if (stepOverride === null) {
      delete mergedRegistry[stepName];
      continue;
    }

    mergedRegistry[stepName] = stepOverride;
  }

  return mergedRegistry;
}

function resolveJourneyConfig(journeyName: string, seen = new Set<string>()): ResolvedJourneyConfig {
  const journey = journeyRegistry[journeyName];
  if (!journey) {
    throw new Error(`Journey '${journeyName}' not found in registry`);
  }

  if (seen.has(journeyName)) {
    throw new Error(`Circular journey inheritance detected for '${journeyName}'`);
  }

  if (!journey.extends) {
    if (!journey.flowConfig || !journey.stepRegistry) {
      throw new Error(`Journey '${journeyName}' must define flowConfig and stepRegistry`);
    }

    return {
      ...journey,
      flowConfig: cloneFlowConfig(journey.flowConfig),
      stepRegistry: normalizeStepRegistry(journey.stepRegistry, journey.flowConfig.basePath),
      translationFolders: journey.translationFolders ? [...journey.translationFolders] : undefined,
    };
  }

  seen.add(journeyName);
  const parentJourney = resolveJourneyConfig(journey.extends, seen);
  seen.delete(journeyName);

  const flowConfig = mergeFlowConfig(parentJourney.flowConfig!, journey.flowConfigOverrides);
  const stepRegistry = normalizeStepRegistry(
    mergeStepRegistry(parentJourney.stepRegistry!, journey.stepRegistryOverrides),
    flowConfig.basePath
  );

  return {
    ...parentJourney,
    ...journey,
    flowConfig,
    stepRegistry,
    translationFolders: journey.translationFolders
      ? [...journey.translationFolders]
      : parentJourney.translationFolders
        ? [...parentJourney.translationFolders]
        : undefined,
  };
}

const professionalRespondToClaimStepOrder = respondToClaimFlowConfig.stepOrder.filter(
  stepName => stepName !== 'free-legal-advice'
);

// Journey registry - add new journeys here
export const journeyRegistry: Record<string, JourneyConfig> = {
  respondToClaim: {
    name: 'respondToClaim',
    profile: 'citizen',
    flowConfig: respondToClaimFlowConfig,
    translationFolders: ['respondToClaim'],
    stepRegistry: respondToClaimStepRegistry,
  },
  professionalRespondToClaim: {
    name: 'professionalRespondToClaim',
    extends: 'respondToClaim',
    profile: 'professional',
    flowConfigOverrides: {
      journeyName: 'professionalRespondToClaim',
      basePath: '/professional/case/:caseReference/respond-to-claim',
      stepOrder: professionalRespondToClaimStepOrder,
      steps: {
        'start-now': {
          routes: [
            {
              condition: async (req: import('express').Request) => isDefendantNameKnown(req),
              nextStep: 'defendant-name-confirmation',
            },
            {
              condition: async (req: import('express').Request) => !isDefendantNameKnown(req),
              nextStep: 'defendant-name-capture',
            },
          ],
          defaultNext: 'defendant-name-capture',
        },
      },
    },
    translationFolders: ['professionalRespondToClaim', 'respondToClaim'],
  },
};

// Helper function to get steps for a specific journey
export function getStepsForJourney(journeyName: string): StepDefinition[] {
  const journey = resolveJourneyConfig(journeyName);
  return journey.flowConfig.stepOrder
    .map((stepName: string) => journey.stepRegistry[stepName])
    .filter((step: StepDefinition | undefined): step is StepDefinition => step !== undefined);
}

export function getJourneyConfig(journeyName: string): ResolvedJourneyConfig {
  return resolveJourneyConfig(journeyName);
}
