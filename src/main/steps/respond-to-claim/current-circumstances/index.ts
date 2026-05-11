import { fromYesNoEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoValue } from '@services/ccdCase.interface';

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
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};
    const shareCircumstances = req.body?.shareCircumstances as string | undefined;
    const ccdMapping: Record<string, YesNoValue> = { yes: 'YES', no: 'NO' };

    if (shareCircumstances && ccdMapping[shareCircumstances]) {
      response.defendantResponses.householdCircumstances.shareAdditionalCircumstances = ccdMapping[shareCircumstances];

      if (shareCircumstances === 'yes') {
        response.defendantResponses.householdCircumstances.additionalCircumstancesDetails = req.body?.[
          'shareCircumstances.circumstancesDetails'
        ] as string | undefined;
      } else {
        delete response.defendantResponses.householdCircumstances.additionalCircumstancesDetails;
      }
    } else {
      delete response.defendantResponses.householdCircumstances.shareAdditionalCircumstances;
      delete response.defendantResponses.householdCircumstances.additionalCircumstancesDetails;
    }

    await saveDraftDefendantResponse(
      req,

      response
    );
  },
  getInitialFormData: req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const circumstances = caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;
    // CCD echoes YesOrNo PascalCase since pcs-api PR #1678 — fromYesNoEnum handles either casing.
    const shareCircumstances = fromYesNoEnum(circumstances?.shareAdditionalCircumstances);

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
