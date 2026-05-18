import { DateTime } from 'luxon';

import {
  formatDatePartsToISODate,
  fromYesNoEnum,
  getValidatedCaseHouseholdCircumstances,
  toYesNoEnum,
} from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'have-you-applied-for-universal-credit',
  isAnswered: req =>
    Boolean(req.res?.locals.validatedCase?.defendantResponses?.householdCircumstances?.hasAppliedForUniversalCredit),
  stepDir: __dirname,
  beforeRedirect: async req => {
    const selection = req.body?.haveAppliedForUniversalCredit as string | undefined;
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};
    const hc = response.defendantResponses.householdCircumstances;

    if (selection === 'no') {
      hc.hasAppliedForUniversalCredit = toYesNoEnum('no');
      delete hc.ucApplicationDate;
    } else if (selection === 'yes') {
      const day = (
        (req.body?.['haveAppliedForUniversalCredit.ucApplicationDate-day'] as string | undefined) ?? ''
      ).trim();
      const month = (
        (req.body?.['haveAppliedForUniversalCredit.ucApplicationDate-month'] as string | undefined) ?? ''
      ).trim();
      const year = (
        (req.body?.['haveAppliedForUniversalCredit.ucApplicationDate-year'] as string | undefined) ?? ''
      ).trim();
      if (!day || !month || !year) {
        throw new Error('Missing universal credit application date submitted');
      }
      const isoDate = formatDatePartsToISODate(day, month, year);
      if (!isoDate) {
        throw new Error('Invalid universal credit application date submitted');
      }
      hc.hasAppliedForUniversalCredit = toYesNoEnum('yes');
      hc.ucApplicationDate = isoDate;
    } else {
      delete hc.hasAppliedForUniversalCredit;
      delete hc.ucApplicationDate;
    }

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: req => {
    const householdCircumstances = getValidatedCaseHouseholdCircumstances(req) as
      | { hasAppliedForUniversalCredit?: string; ucApplicationDate?: string }
      | undefined;

    const data: Record<string, unknown> = {};
    const savedAnswer = fromYesNoEnum(householdCircumstances?.hasAppliedForUniversalCredit);
    const savedDate = householdCircumstances?.ucApplicationDate;

    // Only pre-populate if the answer genuinely came from this screen
    if (savedAnswer === 'yes' && savedDate) {
      data.haveAppliedForUniversalCredit = 'yes';
      const parsed = DateTime.fromISO(savedDate);
      if (parsed.isValid) {
        data['haveAppliedForUniversalCredit.ucApplicationDate'] = {
          day: parsed.toFormat('dd'),
          month: parsed.toFormat('MM'),
          year: parsed.toFormat('yyyy'),
        };
      }
    } else if (savedAnswer === 'no') {
      data.haveAppliedForUniversalCredit = 'no';
    }

    return data;
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
  },
  fields: [
    {
      name: 'haveAppliedForUniversalCredit',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend govuk-visually-hidden',
      translationKey: { label: 'question' },
      errorMessage: 'errors.haveAppliedForUniversalCredit',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            ucApplicationDate: {
              name: 'ucApplicationDate',
              type: 'date',
              required: true,
              noFutureDate: true,
              noCurrentDate: false,
              translationKey: {
                label: 'dateLabel',
                hint: 'dateHint',
              },
              legendClasses: 'govuk-fieldset__legend--s',
            },
          },
        },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
  customTemplate: `${__dirname}/universalCredit.njk`,
});
