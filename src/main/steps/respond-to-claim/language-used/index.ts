import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, LanguageUsed } from '@services/ccdCase.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'language-used',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/languageUsed.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    caption: 'caption',
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
});
