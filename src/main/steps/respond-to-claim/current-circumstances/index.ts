import type { PossessionClaimResponse, YesNoValue } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'your-circumstances',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
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
          value: 'YES',
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
            },
          },
        },
        {
          value: 'NO',
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
    const shareCircumstances = req.body?.shareCircumstances as YesNoValue | undefined;

    if (!shareCircumstances) {
      return;
    }

    const additionalCircumstancesDetails =
      shareCircumstances === 'YES'
        ? (req.body?.['shareCircumstances.circumstancesDetails'] as string | undefined)
        : undefined;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          shareAdditionalCircumstances: shareCircumstances,
          additionalCircumstancesDetails,
        },
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const circumstances = caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;

    // YesOrNo (CCD SDK type) serialises as "Yes"/"No"; normalise to uppercase to match radio option values
    const shareCircumstances = circumstances?.shareAdditionalCircumstances
      ? (String(circumstances.shareAdditionalCircumstances).toUpperCase() as YesNoValue)
      : undefined;

    if (!shareCircumstances) {
      return {};
    }

    return {
      shareCircumstances,
      ...(shareCircumstances === 'YES' && circumstances?.additionalCircumstancesDetails
        ? { 'shareCircumstances.circumstancesDetails': circumstances.additionalCircumstancesDetails }
        : {}),
    };
  },
});
