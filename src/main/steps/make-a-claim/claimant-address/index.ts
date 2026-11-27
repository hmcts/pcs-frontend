import { ADDRESS_TEMPLATE, addressContent, addressFields } from '../addressFields';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'claimant-address',
  stepDir: __dirname,
  customTemplate: ADDRESS_TEMPLATE,
  fields: addressFields('claimant'),
  extendGetContent: (req, formContent) => addressContent(req, 'claimant', formContent),
});
