import type { CaseData, PossessionClaimResponse, YesNoValue } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { Logger } from '@modules/logger';
import { createFormStep } from '@modules/steps';
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
      otherConsiderations === 'Yes' ? req.body?.['otherConsiderations.otherConsiderationsDetails'] : undefined;

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

    if (existingAnswer === 'Yes') {
      const otherConsiderationsDetails: string | undefined =
        caseData?.possessionClaimResponse?.defendantResponses?.otherConsiderationsDetails;
      return {
        otherConsiderations: 'Yes',
        'otherConsiderations.otherConsiderationsDetails': otherConsiderationsDetails ?? '',
      };
    }

    return { otherConsiderations: 'No' };
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
          value: 'Yes',
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
        { value: 'No', translationKey: 'options.no' },
      ],
    },
  ],
});
