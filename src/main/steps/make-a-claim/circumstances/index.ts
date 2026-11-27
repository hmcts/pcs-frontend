import { createInterstitialStep } from '../interstitialStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createInterstitialStep('circumstances', __dirname);
