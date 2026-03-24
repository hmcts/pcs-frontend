import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
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
      name: 'wouldExperienceExceptionalHardship',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'question' },
      errorMessage: 'errors.wouldExperienceExceptionalHardship',
      options: [
        {
          value: 'yes',
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
          value: 'no',
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
    const wouldExperienceExceptionalHardship = req.body?.wouldExperienceExceptionalHardship as string | undefined;

    if (!wouldExperienceExceptionalHardship) {
      return;
    }

    const enumMapping: Record<string, 'YES' | 'NO'> = {
      yes: 'YES',
      no: 'NO',
    };

    const exceptionalHardship = enumMapping[wouldExperienceExceptionalHardship];
    const exceptionalHardshipDetails =
      wouldExperienceExceptionalHardship === 'yes'
        ? (req.body?.['wouldExperienceExceptionalHardship.exceptionalHardshipDetails'] as string | undefined)
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
    const existingAnswer =
      caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances?.exceptionalHardship;
    const exceptionalHardshipDetails =
      caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances?.exceptionalHardshipDetails;

    // Map CCD enum to frontend value
    const formValue =
      existingAnswer === 'YES'
        ? 'yes'
        : existingAnswer === 'NO'
          ? 'no'
          : existingAnswer === 'Yes'
            ? 'yes'
            : existingAnswer === 'No'
              ? 'no'
              : undefined;

    if (!formValue) {
      return {};
    }

    return {
      wouldExperienceExceptionalHardship: formValue,
      ...(formValue === 'yes' && exceptionalHardshipDetails
        ? {
            'wouldExperienceExceptionalHardship.exceptionalHardshipDetails': exceptionalHardshipDetails,
          }
        : {}),
    };
  },
});
