import type { StepDefinition } from '../../interfaces/stepFormData.interface';

import { step as freeLegalAdvice } from './free-legal-advice';
import { step as postcodeFinder } from './postcode-finder';
import { step as startNow } from './start-now';

export const stepRegistry: Record<string, StepDefinition> = {
  'start-now': startNow,
  'postcode-finder': postcodeFinder,
  'free-legal-advice': freeLegalAdvice,
};
