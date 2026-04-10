import { DateTime } from 'luxon';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'defendant-date-of-birth',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  basePath: '/respond-to-claim',
  flowConfig,
  showCancelButton: false,
  beforeRedirect: async req => {
    const dateOfBirth = req.body?.dateOfBirth;
    const existingDob = req.res?.locals.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.dateOfBirth;

    const isEmpty =
      !dateOfBirth || typeof dateOfBirth !== 'object' || (!dateOfBirth.day && !dateOfBirth.month && !dateOfBirth.year);

    if (isEmpty) {
      if (existingDob) {
        const possessionClaimResponse: PossessionClaimResponse = {
          clearFields: ['defendantResponses.dateOfBirth'],
        };
        await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
      }
      return;
    }

    const { day, month, year } = dateOfBirth;

    if (!day || !month || !year) {
      return;
    }

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
