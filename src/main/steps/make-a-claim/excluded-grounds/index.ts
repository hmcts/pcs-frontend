import { longTextField } from '../fieldBuilders';
import { FIELD_LIMITS } from '../fieldLimits';
import { createMakeAClaimStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { EXCLUDED_GROUNDS, type ExcludedGround } from '@services/citizenPossessionClaim.interface';

const OTHER: ExcludedGround = 'OTHER';

export const step: StepDefinition = createMakeAClaimStep({
  stepName: 'excluded-grounds',
  stepDir: __dirname,
  fields: [
    {
      name: 'excludedGrounds',
      type: 'checkbox',
      required: true,
      isPageHeading: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: { label: 'question', hint: 'hint' },
      options: EXCLUDED_GROUNDS.map(ground => ({
        value: ground,
        translationKey: `options.${ground}`,
        ...(ground === OTHER
          ? {
              subFields: {
                excludedOtherGroundDetails: longTextField('excludedOtherGroundDetails', {
                  required: true,
                  maxLength: FIELD_LIMITS.otherGroundsDetails,
                  errorMessage: 'errors.excludedOtherGroundDetails',
                }),
              },
            }
          : {}),
      })),
    },
  ],
});
