import { DateTime } from 'luxon';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { fromYesNoEnum, toYesNoEnum } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'have-you-applied-for-universal-credit',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  beforeRedirect: async req => {
    const selection = req.body?.haveAppliedForUniversalCredit as string | undefined;
    const nestedDate = req.body?.ucApplicationDate as { day?: string; month?: string; year?: string } | undefined;
    const ucApplicationDate = {
      day: req.body?.['ucApplicationDate-day'] as string | undefined,
      month: req.body?.['ucApplicationDate-month'] as string | undefined,
      year: req.body?.['ucApplicationDate-year'] as string | undefined,
    };

    const universalCredit = selection === 'yes' ? toYesNoEnum(selection) : undefined;

    let isoDate: string | undefined;
    if (selection === 'yes' && ucApplicationDate?.day && ucApplicationDate?.month && ucApplicationDate?.year) {
      const dateTime = DateTime.fromObject({
        year: Number(ucApplicationDate.year),
        month: Number(ucApplicationDate.month),
        day: Number(ucApplicationDate.day),
      });
      if (dateTime.isValid) {
        isoDate = dateTime.toISODate() || undefined;
      } else {
        throw new Error('Invalid universal credit application date submitted');
      }
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
    const householdCircumstances = (
      req.res?.locals?.validatedCase?.data as
        | {
            possessionClaimResponse?: {
              defendantResponses?: {
                householdCircumstances?: { universalCredit?: string; ucApplicationDate?: string };
              };
            };
          }
        | undefined
    )?.possessionClaimResponse?.defendantResponses?.householdCircumstances;

    const data: Record<string, unknown> = {};
    const prepopUniversalCredit = fromYesNoEnum(householdCircumstances?.universalCredit);
    if (prepopUniversalCredit) {
      data.haveAppliedForUniversalCredit = prepopUniversalCredit;
    }

    if (householdCircumstances?.ucApplicationDate) {
      const parsed = DateTime.fromISO(householdCircumstances.ucApplicationDate);
      if (parsed.isValid) {
        data.ucApplicationDate = {
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
    caption: 'caption',
  },
  fields: [
    {
      name: 'haveAppliedForUniversalCredit',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--l',
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
