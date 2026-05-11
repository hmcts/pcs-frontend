import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { caseNumberFormatter } from '../../utils/caseNumberFormatter';
import { fromYesNoEnum, toYesNoEnum } from '../../utils/yesNoEnum';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

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
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};

    const provideFinanceDetails = req.body?.provideFinanceDetails as 'yes' | 'no' | undefined;

    if (provideFinanceDetails === 'yes' || provideFinanceDetails === 'no') {
      response.defendantResponses.householdCircumstances.shareIncomeExpenseDetails = toYesNoEnum(provideFinanceDetails);
    } else {
      delete response.defendantResponses.householdCircumstances.shareIncomeExpenseDetails;
    }

    await saveDraftDefendantResponse(
      req,

      response
    );
  },

  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    infoParagraph1: 'infoParagraph1',
    infoParagraph2: 'infoParagraph2',
    infoParagraph3: 'infoParagraph3',
    question: 'question',
    caseNumber: 'caseNumber',
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
  extendGetContent: req => {
    const t = getTranslationFunction(req, 'income-and-expenses', ['common']);
    const caseNumber = caseNumberFormatter(req.res?.locals?.validatedCase?.id as string);

    return {
      caseNumber: t('caseNumber', { caseNumber }),
    };
  },
});
