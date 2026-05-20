import { DateTime } from 'luxon';

import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'defendant-date-of-birth',
  // No isAnswered — DOB is optional. Excluded from section status counting; shown on CYA per GDS.
  stepDir: __dirname,
  showCancelButton: false,
  beforeRedirect: async req => {
    const dateOfBirth = req.body?.dateOfBirth;

    const response = buildDraftDefendantResponse(req);
    let dateSet = false;
    if (dateOfBirth && typeof dateOfBirth === 'object') {
      const { day, month, year } = dateOfBirth;

      if (day && month && year) {
        const dateTime = DateTime.fromObject({
          year: Number(year),
          month: Number(month),
          day: Number(day),
        });

        if (dateTime.isValid) {
          response.defendantResponses.dateOfBirth = dateTime.toISODate();
          dateSet = true;
        }
      }
    }

    if (!dateSet) {
      delete response.defendantResponses.dateOfBirth;
    }

    await saveDraftDefendantResponse(
      req,

      response
    );
  },
  translationKeys: {
    pageTitle: 'pageTitle',
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
