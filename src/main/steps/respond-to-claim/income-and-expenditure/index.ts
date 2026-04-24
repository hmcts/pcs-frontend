import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { fromYesNoEnum, toYesNoEnum } from '../../utils/yesNoEnum';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse } from '@services/ccdCase.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'income-and-expenses',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/incomeAndExpenditure.njk`,

  getInitialFormData: req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const existingAnswer =
      caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances?.shareIncomeExpenseDetails;
    const formValue = fromYesNoEnum(existingAnswer);
    return formValue ? { provideFinanceDetails: formValue } : {};
  },

  beforeRedirect: async req => {
    const provideFinanceDetails = req.body?.provideFinanceDetails as 'yes' | 'no' | undefined;
    if (!provideFinanceDetails) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          shareIncomeExpenseDetails: toYesNoEnum(provideFinanceDetails),
        },
      },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },

  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    infoParagraph1: 'infoParagraph1',
    infoParagraph2: 'infoParagraph2',
    question: 'question',
  },

  fields: [
    {
      name: 'provideFinanceDetails',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        { value: 'yes', translationKey: 'options.yes' },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
});
