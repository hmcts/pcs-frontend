import { DateTime } from 'luxon';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import {
  formatDatePartsToISODate,
  fromYesNoEnum,
  getValidatedCaseHouseholdCircumstances,
  toYesNoEnum,
} from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'have-you-applied-for-universal-credit',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  beforeRedirect: async req => {
    const selection = req.body?.haveAppliedForUniversalCredit as string | undefined;
    if (selection === 'no') {
      const possessionClaimResponse: PossessionClaimResponse = {
        defendantResponses: {
          householdCircumstances: {
            universalCredit: toYesNoEnum('no'),
            ucApplicationDate: undefined,
          },
        },
      };
      await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
      return;
    }

    const day = (
      (req.body?.['haveAppliedForUniversalCredit.ucApplicationDate-day'] as string | undefined) ?? ''
    ).trim();
    const month = (
      (req.body?.['haveAppliedForUniversalCredit.ucApplicationDate-month'] as string | undefined) ?? ''
    ).trim();
    const year = (
      (req.body?.['haveAppliedForUniversalCredit.ucApplicationDate-year'] as string | undefined) ?? ''
    ).trim();

    const universalCredit = selection === 'yes' ? toYesNoEnum(selection) : undefined;

    let isoDate: string | undefined;
    if (selection === 'yes') {
      if (!day || !month || !year) {
        throw new Error('Missing universal credit application date submitted');
      }
      const parsedIsoDate = formatDatePartsToISODate(day, month, year);
      if (!parsedIsoDate) {
        throw new Error('Invalid universal credit application date submitted');
      }
      isoDate = parsedIsoDate;
    }

    if (!universalCredit) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          universalCredit,
          ucApplicationDate: isoDate,
        },
      },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const householdCircumstances = getValidatedCaseHouseholdCircumstances(req) as
      | { universalCredit?: string; ucApplicationDate?: string }
      | undefined;

    const data: Record<string, unknown> = {};
    const prepopUniversalCredit = fromYesNoEnum(householdCircumstances?.universalCredit);
    if (prepopUniversalCredit) {
      data.haveAppliedForUniversalCredit = prepopUniversalCredit;
    }

    if (householdCircumstances?.ucApplicationDate) {
      const parsed = DateTime.fromISO(householdCircumstances.ucApplicationDate);
      if (parsed.isValid) {
        data['haveAppliedForUniversalCredit.ucApplicationDate'] = {
          day: parsed.toFormat('dd'),
          month: parsed.toFormat('MM'),
          year: parsed.toFormat('yyyy'),
        };
      }
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
