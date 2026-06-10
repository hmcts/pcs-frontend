import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, YesNoValue } from '@services/ccdCase.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'other-considerations',
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.otherConsiderations),
  stepDir: __dirname,
  customTemplate: `${__dirname}/otherConsiderations.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    question: 'question',
  },
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const otherConsiderations: YesNoValue | undefined = req.body?.otherConsiderations;

    if (otherConsiderations === 'YES') {
      response.defendantResponses.otherConsiderations = 'YES';
      const details = req.body?.['otherConsiderations.otherConsiderationsDetails'] as string | undefined;
      if (details) {
        response.defendantResponses.otherConsiderationsDetails = details;
      } else {
        delete response.defendantResponses.otherConsiderationsDetails;
      }
    } else if (otherConsiderations === 'NO') {
      response.defendantResponses.otherConsiderations = 'NO';
      delete response.defendantResponses.otherConsiderationsDetails;
    } else {
      delete response.defendantResponses.otherConsiderations;
      delete response.defendantResponses.otherConsiderationsDetails;
    }

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals.validatedCase?.data;
    const existingAnswer: YesNoValue | undefined =
      caseData?.possessionClaimResponse?.defendantResponses?.otherConsiderations;

    if (!existingAnswer) {
      return {};
    }

    if (existingAnswer === 'YES') {
      const otherConsiderationsDetails: string | undefined =
        caseData?.possessionClaimResponse?.defendantResponses?.otherConsiderationsDetails;
      return {
        otherConsiderations: 'YES',
        'otherConsiderations.otherConsiderationsDetails': otherConsiderationsDetails ?? '',
      };
    }

    return { otherConsiderations: 'NO' };
  },
  fields: [
    {
      name: 'otherConsiderations',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-visually-hidden',
      translationKey: {
        label: 'heading',
      },
      errorMessage: 'errors.otherConsiderations',
      options: [
        {
          value: 'YES',
          translationKey: 'options.yes',
          subFields: {
            otherConsiderationsDetails: {
              name: 'otherConsiderationsDetails',
              type: 'character-count',
              required: true,
              maxLength: 6400,
              translationKey: {
                label: 'otherConsiderationsDetailsLabel',
              },
              labelClasses: 'govuk-label govuk-!-font-weight-bold',
              errorMessage: 'errors.otherConsiderationsDetails',
              validator: (value: unknown) => {
                const text = (value as string)?.trim();
                const allowedCharsRegex = /^[^\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;

                if (allowedCharsRegex.test(text)) {
                  return true;
                }
                return 'errors.otherConsiderationsInvalid';
              },
            },
          },
        },
        { value: 'NO', translationKey: 'options.no' },
      ],
    },
  ],
});
