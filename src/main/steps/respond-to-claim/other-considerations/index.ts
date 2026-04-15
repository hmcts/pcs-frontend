import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { Logger } from '@modules/logger';
import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CaseData, PossessionClaimResponse, YesNoValue } from '@services/ccdCase.interface';
const logger = Logger.getLogger('OtherConsiderationsStep');

export const step: StepDefinition = createFormStep({
  stepName: 'other-considerations',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/otherConsiderations.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
  },
  beforeRedirect: async req => {
    const otherConsiderations: YesNoValue | undefined = req.body?.otherConsiderations;

    if (!otherConsiderations) {
      logger.warn('Invalid or missing otherConsiderations value', {
        otherConsiderations,
      });
      return;
    }

    const otherConsiderationsDetails: string | undefined =
      otherConsiderations === 'YES' ? req.body?.['otherConsiderations.otherConsiderationsDetails'] : undefined;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        otherConsiderations,
        otherConsiderationsDetails: otherConsiderationsDetails ?? '',
      },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const caseData: CaseData | undefined = req.res?.locals?.validatedCase?.data;
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
              labelClasses: 'govuk-label',
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
