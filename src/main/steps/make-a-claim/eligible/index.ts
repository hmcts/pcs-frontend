import { taskListPath } from '../flow.config';
import { caseReferenceOf } from '../formStep';
import { createInterstitialStep } from '../interstitialStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createInterstitialStep('eligible', __dirname, {
  extendGetContent: req => ({ saveAndContinue: getTranslationFunction(req)('startNow') }),
  resolveRedirectAfterPost: async req => taskListPath(caseReferenceOf(req)),
});
