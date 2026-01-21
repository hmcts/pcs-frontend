import type { StepDefinition } from '../../interfaces/stepFormData.interface';

import { step as contactPreferences } from './contact-preferences';
import { step as freeLegalAdvice } from './free-legal-advice';
import { step as postcodeFinder } from './postcode-finder';
import { step as startNow } from './start-now';

export const stepRegistry: Record<string, StepDefinition> = {
  'start-now': startNow,
  'postcode-finder': postcodeFinder,
  'contact-preferences': contactPreferences,
  'free-legal-advice': freeLegalAdvice,
};
