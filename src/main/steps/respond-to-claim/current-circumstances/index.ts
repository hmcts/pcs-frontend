import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
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
      legendClasses: 'govuk-fieldset__legend--l',
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

    if (!shareCircumstances) {
      return;
    }

    const shareAdditionalCircumstances = shareCircumstances === 'yes' ? 'YES' : 'NO';
    const additionalCircumstancesDetails =
      shareCircumstances === 'yes' ? (req.body?.circumstancesDetails as string | undefined) : undefined;

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
    const circumstances =
      caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;

    if (!circumstances?.shareAdditionalCircumstances) {
      return {};
    }

    const shareCircumstances = circumstances.shareAdditionalCircumstances === 'YES' ? 'yes' : 'no';

    return {
      shareCircumstances,
      ...(shareCircumstances === 'yes' && circumstances.additionalCircumstancesDetails
        ? { circumstancesDetails: circumstances.additionalCircumstancesDetails }
        : {}),
    };
  },
});
