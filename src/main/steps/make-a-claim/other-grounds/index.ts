import { longTextField } from '../fieldBuilders';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { DISCRETIONARY_OTHER_GROUNDS, MANDATORY_OTHER_GROUNDS } from '@services/citizenPossessionClaim.interface';

const noneChosen = (value: unknown): boolean => value === undefined || (Array.isArray(value) && value.length === 0);

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'other-grounds',
  stepDir: __dirname,
  fields: [
    {
      name: 'mandatoryGrounds',
      type: 'checkbox',
      required: formData => noneChosen(formData.discretionaryGrounds),
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'mandatory.legend', hint: 'mandatory.hint' },
      options: MANDATORY_OTHER_GROUNDS.map(ground => ({
        value: ground,
        translationKey: `makeAClaim:grounds.${ground}`,
        ...(ground === 'OTHER'
          ? {
              subFields: {
                otherGroundsDetails: longTextField('otherGroundsDetails', {
                  required: true,
                  errorMessage: 'errors.otherGroundsDetails',
                }),
              },
            }
          : {}),
      })),
    },
    {
      name: 'discretionaryGrounds',
      type: 'checkbox',
      required: false,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'discretionary.legend', hint: 'discretionary.hint' },
      options: DISCRETIONARY_OTHER_GROUNDS.map(ground => ({
        value: ground,
        translationKey: `makeAClaim:grounds.${ground}`,
      })),
    },
  ],
});
