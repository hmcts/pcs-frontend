import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { caseNumberFormatter } from '../../utils/caseNumberFormatter';
import { createRespondToClaimFormStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, LanguageUsed } from '@services/ccdCase.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'language-used',
  stepDir: __dirname,
  customTemplate: `${__dirname}/languageUsed.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
    languageHeading: 'languageHeading',
    question: 'question',
  },
  fields: [
    {
      name: 'languageUsed',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-visually-hidden',
      translationKey: {
        label: 'heading',
      },
      errorMessage: 'errors.languageUsed',
      options: [
        { value: 'ENGLISH', translationKey: 'language.english' },
        { value: 'WELSH', translationKey: 'language.welsh' },
        { value: 'ENGLISH_AND_WELSH', translationKey: 'language.englishAndWelsh' },
      ],
    },
  ],
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals?.validatedCase?.data;
    const languageUsedCcd: LanguageUsed | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.languageUsed;

    return languageUsedCcd ? { languageUsed: languageUsedCcd } : {};
  },
  beforeRedirect: async req => {
    const languageUsed: LanguageUsed | undefined = req.body?.languageUsed;
    const response = buildDraftDefendantResponse(req);

    if (languageUsed) {
      response.defendantResponses = { ...response.defendantResponses, languageUsed };
    }

    await saveDraftDefendantResponse(req, response);
  },
  extendGetContent: req => {
    const caseNumber = caseNumberFormatter(req.res?.locals?.validatedCase?.id as string);
    const t = getTranslationFunction(req, 'language-used', ['common']);

    return {
      caseNumber: t('caseNumber', { caseNumber }),
    };
  },
});
