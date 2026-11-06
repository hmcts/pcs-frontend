import { createMakeAClaimStep } from './formStep';

import type { FormBuilderConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

/** A page that tells the claimant what comes next, with nothing to answer. */
export function createInterstitialStep(
  stepName: string,
  stepDir: string,
  extra: Partial<Omit<FormBuilderConfig, 'stepName' | 'stepDir' | 'journeyFolder' | 'flowConfig'>> = {}
): StepDefinition {
  return createMakeAClaimStep({ stepName, stepDir, fields: [], interstitial: true, ...extra });
}
