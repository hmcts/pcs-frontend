import type { PossessionClaimResponse, YesNoValue } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'exceptional-hardship',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
  },
  fields: [
    {
      name: 'exceptionalHardship',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'question' },
      errorMessage: 'errors.exceptionalHardship',
      options: [
        {
          value: 'YES',
          translationKey: 'options.yes',
          subFields: {
            exceptionalHardshipDetails: {
              name: 'exceptionalHardshipDetails',
              type: 'character-count',
              required: true,
              maxLength: 500,
              errorMessage: 'errors.exceptionalHardshipDetails',
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
  customTemplate: `${__dirname}/exceptionalHardship.njk`,
  extendGetContent: req => {
    const t = getTranslationFunction(req, 'exceptional-hardship', ['common']);

    return {
      introParagraph1: t('introParagraph1'),
      introParagraph2: t('introParagraph2'),
      introParagraph3: t('introParagraph3'),
      forExample: t('forExample'),
      bullet1: t('bullet1'),
      bullet2: t('bullet2'),
      bullet3: t('bullet3'),
      bullet4: t('bullet4'),
    };
  },
  beforeRedirect: async req => {
    const exceptionalHardship = req.body?.exceptionalHardship as YesNoValue | undefined;

    if (!exceptionalHardship) {
      return;
    }

    const exceptionalHardshipDetails =
      exceptionalHardship === 'YES'
        ? (req.body?.['exceptionalHardship.exceptionalHardshipDetails'] as string | undefined)
        : undefined;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances: {
          exceptionalHardship,
          exceptionalHardshipDetails,
        },
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const householdCircumstances = caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;

    // YesOrNo (CCD SDK type) serialises as "Yes"/"No"; normalise to uppercase to match radio option values
    const exceptionalHardship = householdCircumstances?.exceptionalHardship
      ? (String(householdCircumstances.exceptionalHardship).toUpperCase() as YesNoValue)
      : undefined;

    if (!exceptionalHardship) {
      return {};
    }

    return {
      exceptionalHardship,
      ...(exceptionalHardship === 'YES' && householdCircumstances?.exceptionalHardshipDetails
        ? {
            'exceptionalHardship.exceptionalHardshipDetails': householdCircumstances.exceptionalHardshipDetails,
          }
        : {}),
    };
  },
});
