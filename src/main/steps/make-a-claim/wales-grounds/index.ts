import { longTextField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import {
  OTHER_GROUND,
  WALES_DISCRETIONARY_GROUNDS,
  WALES_MANDATORY_GROUNDS,
} from '@services/citizenPossessionClaim.interface';

const noneChosen = (value: unknown): boolean => value === undefined || (Array.isArray(value) && value.length === 0);

const groundOptions = (grounds: readonly string[]) =>
  grounds.map(ground => ({ value: ground, translationKey: `makeAClaim:grounds.${ground}` }));

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'wales-grounds',
  stepDir: __dirname,
  fields: [
    {
      name: 'walesDiscretionaryGrounds',
      type: 'checkbox',
      required: formData => noneChosen(formData.walesMandatoryGrounds),
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'discretionary.legend', hint: 'discretionary.hint' },
      options: [
        ...groundOptions(WALES_DISCRETIONARY_GROUNDS),
        {
          value: OTHER_GROUND,
          translationKey: 'makeAClaim:grounds.WALES_OTHER',
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
    {
      name: 'walesMandatoryGrounds',
      type: 'checkbox',
      required: false,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'mandatory.legend', hint: 'mandatory.hint' },
      options: groundOptions(WALES_MANDATORY_GROUNDS),
    },
  ],
});
