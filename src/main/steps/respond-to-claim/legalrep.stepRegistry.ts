import { step as selectDefendant } from './select-defendant';
import { stepRegistry } from './stepRegistry';

import { StepDefinition } from '@modules/steps/stepFormData.interface';

export const legalRepStepRegistry = {
  ...stepRegistry,

  'select-defendant': selectDefendant,
} satisfies Record<string, StepDefinition>;
