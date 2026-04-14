import type { Request } from 'express';

import type { PossessionClaimResponse, YesNoValue } from '../../../interfaces/ccdCase.interface';
import { fromYesNoEnum, toYesNoEnum } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@interfaces/stepFormData.interface';
import { createFormStep } from '@modules/steps';

function includesUniversalCreditSelection(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.includes('universalCredit');
  }
  return value === 'universalCredit';
}

export const step: StepDefinition = createFormStep({
  stepName: 'what-regular-income-do-you-receive',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  beforeRedirect: async (req: Request) => {
    const universalCreditSelected = includesUniversalCreditSelection(req.body?.regularIncome);

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          universalCredit: toYesNoEnum(universalCreditSelected ? 'yes' : 'no'),
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
                householdCircumstances?: { universalCredit?: YesNoValue };
              };
            };
          }
        | undefined
    )?.possessionClaimResponse?.defendantResponses?.householdCircumstances;

    if (fromYesNoEnum(householdCircumstances?.universalCredit) === 'yes') {
      return { regularIncome: ['universalCredit'] };
    }

    return {};
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    hint: 'hint',
    fieldsetLegend: 'fieldsetLegend',
    optionUniversalCredit: 'optionUniversalCredit',
  },
  fields: [],
  customTemplate: `${__dirname}/regularIncome.njk`,
});
