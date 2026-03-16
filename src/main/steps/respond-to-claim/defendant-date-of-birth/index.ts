import { DateTime } from 'luxon';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { dateToISO } from '../../../mappers/ccdMappers';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'defendant-date-of-birth',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  basePath: '/respond-to-claim',
  flowConfig,
  showCancelButton: false,
  ccdMapping: {
    backendPath: 'possessionClaimResponse.defendantResponses',
    frontendField: 'dateOfBirth',
    valueMapper: dateToISO('dateOfBirth'),
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  getInitialFormData: req => {
    const caseData = req.res?.locals.validatedCase?.data;
    const dateOfBirth = caseData?.possessionClaimResponse?.defendantResponses?.dateOfBirth;

    if (!dateOfBirth || typeof dateOfBirth !== 'string') {
      return {};
    }

    const dateTime = DateTime.fromISO(dateOfBirth);
    if (!dateTime.isValid) {
      return {};
    }

    return {
      dateOfBirth: {
        day: dateTime.toFormat('dd'),
        month: dateTime.toFormat('MM'),
        year: dateTime.toFormat('yyyy'),
      },
    };
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
