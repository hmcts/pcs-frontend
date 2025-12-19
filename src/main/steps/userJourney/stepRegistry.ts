import type { StepDefinition } from '../../interfaces/stepFormData.interface';

import { step as applicationSubmitted } from './application-submitted';
import { step as enterAddress } from './enter-address';
import { step as enterAge } from './enter-age';
import { step as enterContactPreferences } from './enter-contact-preferences';
import { step as enterDob } from './enter-dob';
import { step as enterGround } from './enter-ground';
import { step as enterOtherReason } from './enter-other-reason';
import { step as enterUserDetails } from './enter-user-details';
import { step as ineligible } from './ineligible';
import { step as summary } from './summary';

export const stepRegistry: Record<string, StepDefinition> = {
  'enter-age': enterAge,
  'enter-dob': enterDob,
  'enter-ground': enterGround,
  'enter-other-reason': enterOtherReason,
  ineligible,
  'enter-contact-preferences': enterContactPreferences,
  'enter-user-details': enterUserDetails,
  'enter-address': enterAddress,
  summary,
  'application-submitted': applicationSubmitted,
};
