import { DateTime } from 'luxon';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'defendant-date-of-birth',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  basePath: '/respond-to-claim',
  flowConfig,
  showCancelButton: false,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  extendGetContent: async (req, formContent) => {
    const caseData = req.res?.locals.validatedCase?.data;
    const dateOfBirth = caseData?.possessionClaimResponse?.defendantResponses?.dateOfBirth;

    // Only prepopulate on GET (not POST with validation errors)
    if (!req.body?.day && dateOfBirth && typeof dateOfBirth === 'string' && dateOfBirth.length > 0) {
      const dateTime = DateTime.fromISO(dateOfBirth);

      if (dateTime.isValid) {
        const day = String(dateTime.day);
        const month = String(dateTime.month);
        const year = String(dateTime.year);

        formContent.fields = formContent.fields.map(field => {
          if (field.name === 'dateOfBirth') {
            return {
              ...field,
              value: { day, month, year },
            };
          }
          return field;
        });
      }
    }

    return formContent;
  },
  fields: [
    {
      legendClasses: 'govuk-fieldset__legend--l govuk-!-margin-bottom-9',
      name: 'dateOfBirth',
      type: 'date',
      required: false,
      noFutureDate: true,
      translationKey: {
        label: 'dateOfBirthLabel',
      },
    },
  ],
});
