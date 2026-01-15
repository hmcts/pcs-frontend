import type { StepDefinition } from '../../interfaces/stepFormData.interface';

import { step as contactPreferences } from './contact-preferences';
import { step as contactPreferencesTextMessage } from './contact-preferences-text-message';
import { step as freeLegalAdvice } from './free-legal-advice';
import { step as interstitial } from './interstitial';
import { step as postcodeFinder } from './postcode-finder';
import { step as startNow } from './start-now';

export const stepRegistry: Record<string, StepDefinition> = {
  'start-now': startNow,
  'postcode-finder': postcodeFinder,
  'free-legal-advice': freeLegalAdvice,
  'contact-preferences': contactPreferences,
  'contact-preferences-text-message': contactPreferencesTextMessage,
  interstitial,
};
