import { ADDRESS_TEMPLATE, addressContent, addressFields } from '../../addressFields';
import { createStartStep } from '../startStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createStartStep({
  stepName: 'property-address',
  stepDir: __dirname,
  customTemplate: ADDRESS_TEMPLATE,
  fields: addressFields('property'),
  extendGetContent: req => addressContent(req, 'property'),
});
