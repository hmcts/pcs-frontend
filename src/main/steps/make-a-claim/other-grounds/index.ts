import { longTextField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import {
  DISCRETIONARY_OTHER_GROUNDS,
  MANDATORY_OTHER_GROUNDS,
  OTHER_GROUND,
} from '@services/citizenPossessionClaim.interface';

const noneChosen = (...values: unknown[]): boolean =>
  values.every(value => value === undefined || (Array.isArray(value) && value.length === 0));

const groundOptions = (grounds: readonly string[]) =>
  grounds.map(ground => ({ value: ground, translationKey: `makeAClaim:grounds.${ground}` }));

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'other-grounds',
  stepDir: __dirname,
  fields: [
    {
      name: 'mandatoryGrounds',
      type: 'checkbox',
      required: formData => noneChosen(formData.discretionaryGrounds, formData.otherGround),
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'mandatory.legend', hint: 'mandatory.hint' },
      options: groundOptions(MANDATORY_OTHER_GROUNDS),
    },
    {
      name: 'discretionaryGrounds',
      type: 'checkbox',
      required: false,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'discretionary.legend', hint: 'discretionary.hint' },
      options: groundOptions(DISCRETIONARY_OTHER_GROUNDS),
    },
    {
      name: 'otherGround',
      type: 'checkbox',
      required: false,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'other.legend' },
      options: [
        {
          value: OTHER_GROUND,
          translationKey: `makeAClaim:grounds.${OTHER_GROUND}`,
          subFields: {
            otherGroundsDetails: longTextField('otherGroundsDetails', {
              required: true,
              maxLength: FIELD_LIMITS.otherGroundsDetails,
              errorMessage: 'errors.otherGroundsDetails',
            }),
          },
        },
      ],
    },
  ],
});
