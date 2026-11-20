import { step as claimantType } from './claimant-type';
import { step as notLitigantInPerson } from './not-litigant-in-person';
import { step as notPrivateLandlord } from './not-private-landlord';
import { step as propertyAddress } from './property-address';
import { step as propertyCountry } from './property-country';
import { step as propertyIneligible } from './property-ineligible';
import { step as propertyNotCovered } from './property-not-covered';
import { step as start } from './start';
import { step as trespass } from './trespass';
import { step as trespassIneligible } from './trespass-ineligible';
import { step as whoIsClaiming } from './who-is-claiming';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const startStepRegistry: Record<string, StepDefinition> = {
  start,
  'claimant-type': claimantType,
  'not-private-landlord': notPrivateLandlord,
  trespass,
  'trespass-ineligible': trespassIneligible,
  'property-address': propertyAddress,
  'property-ineligible': propertyIneligible,
  'who-is-claiming': whoIsClaiming,
  'not-litigant-in-person': notLitigantInPerson,
  'property-country': propertyCountry,
  'property-not-covered': propertyNotCovered,
};
