import type { Request } from 'express';

import { getUserType } from '../utils';

import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from './flow.config';
import { legalrepFlowConfig } from './legalrep.flow.config';

import { createFormStep } from '@modules/steps';
import type { FormBuilderConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
type RespondToClaimFormStepConfig = Omit<FormBuilderConfig, 'journeyFolder' | 'flowConfig' | 'basePath'>;

function resolveRespondToClaimFlowConfig(req: Request) {
  return getUserType(req) === 'legalrep' ? legalrepFlowConfig : flowConfig;
}

export function createRespondToClaimFormStep(config: RespondToClaimFormStepConfig): StepDefinition {
  return createFormStep({
    ...config,
    journeyFolder: 'respondToClaim',
    basePath: RESPOND_TO_CLAIM_ROUTE,
    flowConfig: resolveRespondToClaimFlowConfig,
  });
}
