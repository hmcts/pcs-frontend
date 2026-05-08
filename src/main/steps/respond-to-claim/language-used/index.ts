import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, LanguageUsed, PossessionClaimResponse } from '@services/ccdCase.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'language-used',
  stepDir: __dirname,
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

    if (!languageUsed) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        languageUsed,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
