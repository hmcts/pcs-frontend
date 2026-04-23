import { DateTime } from 'luxon';

import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse } from '@services/ccdCaseData.model';

export const step: StepDefinition = createFormStep({
  stepName: 'defendant-date-of-birth',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  basePath: '/respond-to-claim',
  flowConfig,
  showCancelButton: false,
  beforeRedirect: async req => {
    const dateOfBirth = req.body?.dateOfBirth;

    if (!dateOfBirth || typeof dateOfBirth !== 'object') {
      return;
    }

    const { day, month, year } = dateOfBirth;

    if (!day || !month || !year) {
      return;
    }

    // Validate and convert to ISO date (same logic as dateToISO)
    const dateTime = DateTime.fromObject({
      year: Number(year),
      month: Number(month),
      day: Number(day),
    });

    if (!dateTime.isValid) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        dateOfBirth: dateTime.toISODate(),
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  getInitialFormData: req => {
    const { defendantResponsesDateOfBirth: dateOfBirth } = req.res?.locals.validatedCase ?? {
      defendantResponsesDateOfBirth: undefined,
    };

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
      isPageHeading: true,
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
