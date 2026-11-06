import { textField } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'claimant-name',
  stepDir: __dirname,
  fields: [
    textField('firstName', { maxLength: 60, attributes: { autocomplete: 'given-name', spellcheck: false } }),
    textField('lastName', { maxLength: 60, attributes: { autocomplete: 'family-name', spellcheck: false } }),
  ],
});
