import type { Request } from 'express';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { fromYesNoEnum, toYesNoEnum } from '../../utils/yesNoEnum';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'universal-credit',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/universalCredit.njk`,

  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const hc = caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;

    if (!hc) {
      return {};
    }

    const formData: Record<string, unknown> = {};

    // Convert YES/NO to yes/no
    if (hc.universalCredit) {
      formData.appliedForUniversalCredit = fromYesNoEnum(hc.universalCredit);
    }

    // Convert date from YYYY-MM-DD to day/month/year fields
    if (hc.ucApplicationDate) {
      const dateStr = hc.ucApplicationDate as string;
      const [year, month, day] = dateStr.split('-');
      formData['applicationDate-day'] = day;
      formData['applicationDate-month'] = month;
      formData['applicationDate-year'] = year;
    }

    return formData;
  },

  beforeRedirect: async (req: Request) => {
    const appliedForUC = req.body?.appliedForUniversalCredit as 'yes' | 'no' | undefined;

    if (!appliedForUC) {
      return;
    }

    const householdCircumstances: Record<string, unknown> = {
      universalCredit: toYesNoEnum(appliedForUC),
    };

    // Only save date if they answered "yes"
    if (appliedForUC === 'yes') {
      const day = req.body?.['applicationDate-day'] as string | undefined;
      const month = req.body?.['applicationDate-month'] as string | undefined;
      const year = req.body?.['applicationDate-year'] as string | undefined;

      if (day && month && year) {
        // Store as ISO date string (YYYY-MM-DD)
        householdCircumstances.ucApplicationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances,
      },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },

  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
  },

  fields: [
    {
      name: 'appliedForUniversalCredit',
      type: 'radio',
      required: true,
      errorMessage: 'errors.appliedForUniversalCredit.required',
      translationKey: { label: 'pageTitle' },
      legendClasses: 'govuk-fieldset__legend--l',
      legendIsPageHeading: true,
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            applicationDate: {
              name: 'applicationDate',
              type: 'date',
              required: true,
              noFutureDate: true,
              translationKey: {
                label: 'subFields.applicationDate.label',
                hint: 'subFields.applicationDate.hint',
              },
            },
          },
        },
        {
          value: 'no',
          translationKey: 'options.no',
        },
      ],
    },
  ],
});
