import { taskListUrl } from '../formStep';
import { createInterstitialStep } from '../interstitialStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createInterstitialStep('eligible', __dirname, {
  resolveRedirectAfterPost: async req => taskListUrl(req),
});
