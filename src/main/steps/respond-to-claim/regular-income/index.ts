import type { Request } from 'express';

import type { PossessionClaimResponse, YesNoValue } from '../../../services/ccdCase.interface';
import { fromYesNoEnum, getValidatedCaseHouseholdCircumstances, toYesNoEnum } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

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
    const existingHouseholdCircumstances = getValidatedCaseHouseholdCircumstances(req) as
      | { universalCredit?: YesNoValue; ucApplicationDate?: string | null }
      | undefined;
    const hasExistingUcAnswer = fromYesNoEnum(existingHouseholdCircumstances?.universalCredit) === 'yes';
    const hasExistingUcDate = Boolean(existingHouseholdCircumstances?.ucApplicationDate);

    if (!universalCreditSelected && !hasExistingUcAnswer && !hasExistingUcDate) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          universalCredit: toYesNoEnum(universalCreditSelected ? 'yes' : 'no'),
          ucApplicationDate: universalCreditSelected ? undefined : null,
        },
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const householdCircumstances = getValidatedCaseHouseholdCircumstances(req) as
      | { universalCredit?: YesNoValue }
      | undefined;

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
