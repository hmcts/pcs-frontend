import type { Request } from 'express';

import type { PossessionClaimResponse, YesNoValue } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

function includesUniversalCreditSelection(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.includes('universalCredit');
  }
  return value === 'universalCredit';
}

function toYesNoValue(selected: boolean): YesNoValue {
  return selected ? 'YES' : 'NO';
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
          universalCredit: toYesNoValue(universalCreditSelected),
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

    if (householdCircumstances?.universalCredit === 'YES') {
      return { regularIncome: ['universalCredit'] };
    }

    return {};
  },
  fields: [],
  customTemplate: `${__dirname}/regularIncome.njk`,
});
