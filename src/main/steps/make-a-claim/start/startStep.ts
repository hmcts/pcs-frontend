import { sharedPageContent } from '../formStep';

import { startFlowConfig } from './flow.config';

import { createFormStep } from '@modules/steps';
import type { BuiltFormContent, FormBuilderConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

type StartStepConfig = Omit<FormBuilderConfig, 'journeyFolder' | 'flowConfig' | 'basePath'>;

/** A page asked before the claim exists. Its answers wait in the session until the claim is created. */
export function createStartStep(config: StartStepConfig): StepDefinition {
  return createFormStep({
    customTemplate: 'make-a-claim/templates/question.njk',
    ...config,
    extendGetContent: async (req, formContent: BuiltFormContent) => ({
      ...sharedPageContent(req, true),
      dashboardUrl: undefined,
      ...(config.extendGetContent ? await config.extendGetContent(req, formContent) : {}),
    }),
    journeyFolder: 'makeAClaim',
    flowConfig: startFlowConfig,
  });
}

export function createIneligibleStep(stepName: string, stepDir: string): StepDefinition {
  return createStartStep({
    stepName,
    stepDir,
    fields: [],
    customTemplate: 'make-a-claim/templates/info.njk',
    extendGetContent: () => ({ exitUrl: 'https://www.gov.uk' }),
  });
}
