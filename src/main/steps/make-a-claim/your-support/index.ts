import { createInterstitialStep } from '../interstitialStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createInterstitialStep('your-support', __dirname);
