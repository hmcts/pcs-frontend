import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse, YesNoValue } from '@services/ccdCase.interface';

export const step: StepDefinition = createFormStep({
  stepName: 'your-circumstances',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  translationKeys: {
    pageTitle: 'pageTitle',
  },
  fields: [
    {
      name: 'shareCircumstances',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'question' },
      errorMessage: 'errors.shareCircumstances',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            circumstancesDetails: {
              name: 'circumstancesDetails',
              type: 'character-count',
              required: true,
              maxLength: 500,
              errorMessage: 'errors.circumstancesDetails',
              translationKey: { label: 'textAreaLabel' },
              attributes: {
                rows: 5,
              },
              validator: (value: unknown): boolean | string => {
                if (typeof value !== 'string' || !value.trim()) {
                  return true;
                }

                const invalidCharacters = /\p{Emoji_Presentation}|\p{Extended_Pictographic}|\u200D|\uFE0F/u;
                return !invalidCharacters.test(value) || 'errors.circumstancesDetailsInvalidCharacters';
              },
            },
          },
        },
        {
          value: 'no',
          translationKey: 'options.no',
        },
      ],
    },
  ],
  customTemplate: `${__dirname}/currentCircumstances.njk`,
  extendGetContent: req => {
    const t = getTranslationFunction(req, 'your-circumstances', ['common']);

    return {
      introParagraph: t('introParagraph'),
      forExample: t('forExample'),
      bullet1: t('bullet1'),
      bullet2: t('bullet2'),
      bullet3: t('bullet3'),
    };
  },
  beforeRedirect: async req => {
    const shareCircumstances = req.body?.shareCircumstances as string | undefined;

    if (!shareCircumstances || (shareCircumstances !== 'yes' && shareCircumstances !== 'no')) {
      return;
    }

    const ccdMapping: Record<'yes' | 'no', YesNoValue> = { yes: 'YES', no: 'NO' };
    const shareAdditionalCircumstances = ccdMapping[shareCircumstances];
    const additionalCircumstancesDetails =
      shareCircumstances === 'yes'
        ? (req.body?.['shareCircumstances.circumstancesDetails'] as string | undefined)
        : undefined;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          shareAdditionalCircumstances,
          additionalCircumstancesDetails,
        },
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const circumstances = caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;
    const existingAnswer = circumstances?.shareAdditionalCircumstances as string | undefined;

    const mapping: Record<string, string> = { Yes: 'yes', No: 'no' };
    const shareCircumstances = existingAnswer ? mapping[existingAnswer] : undefined;

    if (!shareCircumstances) {
      return {};
    }

    return {
      shareCircumstances,
      ...(shareCircumstances === 'yes' && circumstances?.additionalCircumstancesDetails
        ? { 'shareCircumstances.circumstancesDetails': circumstances.additionalCircumstancesDetails }
        : {}),
    };
  },
});
