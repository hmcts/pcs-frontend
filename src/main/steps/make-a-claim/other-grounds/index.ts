import { longTextField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { FormFieldConfig } from '@modules/steps/formBuilder/formFieldConfig.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import {
  DISCRETIONARY_GROUNDS_LISTED,
  MANDATORY_GROUNDS_LISTED,
  OTHER_GROUND,
} from '@services/citizenPossessionClaim.interface';

const noneChosen = (...values: unknown[]): boolean =>
  values.every(value => value === undefined || (Array.isArray(value) && value.length === 0));

/** The grounds page words the rent arrears grounds, and "Others", on its own, apart from the other pages. */
const SHORT_LABELLED: readonly string[] = ['GROUND_8', 'GROUND_10', 'GROUND_11', OTHER_GROUND];

const groundOption = (ground: string) => ({
  value: ground,
  translationKey: `makeAClaim:${SHORT_LABELLED.includes(ground) ? 'groundsOnList' : 'grounds'}.${ground}`,
});

/** Each group ends with "Others", which reveals a field for the details. */
const groupOptions = (grounds: readonly string[]) => [
  ...grounds.map(groundOption),
  {
    ...groundOption(OTHER_GROUND),
    subFields: {
      otherGroundsDetails: longTextField('otherGroundsDetails', {
        required: true,
        maxLength: FIELD_LIMITS.otherGroundsDetails,
        errorMessage: 'errors.otherGroundsDetails',
      }),
    },
  },
];

const group = (name: string, translationPrefix: string, grounds: readonly string[], extra: Partial<FormFieldConfig>) =>
  ({
    name,
    type: 'checkbox',
    required: false,
    legendClasses: 'govuk-fieldset__legend--m',
    translationKey: { label: `${translationPrefix}.legend`, hint: `${translationPrefix}.hint` },
    options: groupOptions(grounds),
    ...extra,
  }) as FormFieldConfig;

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'other-grounds',
  stepDir: __dirname,
  fields: [
    group('mandatoryGrounds', 'mandatory', MANDATORY_GROUNDS_LISTED, {
      required: formData => noneChosen(formData.discretionaryGrounds),
    }),
    group('discretionaryGrounds', 'discretionary', DISCRETIONARY_GROUNDS_LISTED, {}),
  ],
});
