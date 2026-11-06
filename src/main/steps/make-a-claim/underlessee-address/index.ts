import { ADDRESS_TEMPLATE, addressContent, addressFields } from '../addressFields';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'underlessee-address',
  stepDir: __dirname,
  customTemplate: ADDRESS_TEMPLATE,
  fields: addressFields('underlessee'),
  extendGetContent: req => addressContent(req, 'underlessee'),
});
