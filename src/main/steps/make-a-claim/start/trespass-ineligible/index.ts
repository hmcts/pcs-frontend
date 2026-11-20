import { createIneligibleStep } from '../startStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createIneligibleStep('trespass-ineligible', __dirname);
