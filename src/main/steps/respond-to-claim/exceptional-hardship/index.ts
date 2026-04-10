import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import type { PossessionClaimResponse, YesNoValue } from '@interfaces/ccdCase.interface';
import type { StepDefinition } from '@interfaces/stepFormData.interface';
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
              validator: (value: unknown): boolean | string => {
                if (typeof value !== 'string' || !value.trim()) {
                  return true;
                }

                const invalidCharacters = /\p{Emoji_Presentation}|\p{Extended_Pictographic}|\u200D|\uFE0F/u;
                return !invalidCharacters.test(value) || 'errors.exceptionalHardshipDetailsInvalidCharacters';
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
    const exceptionalHardshipValue = req.body?.exceptionalHardship as string | undefined;

    if (!exceptionalHardshipValue || (exceptionalHardshipValue !== 'yes' && exceptionalHardshipValue !== 'no')) {
      return;
    }

    const ccdMapping: Record<'yes' | 'no', YesNoValue> = { yes: 'Yes', no: 'No' };
    const exceptionalHardship = ccdMapping[exceptionalHardshipValue];
    const exceptionalHardshipDetails =
      exceptionalHardshipValue === 'yes'
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
    const existingAnswer = householdCircumstances?.exceptionalHardship as string | undefined;

    const mapping: Record<string, string> = { Yes: 'yes', No: 'no' };
    const exceptionalHardshipValue = existingAnswer ? mapping[existingAnswer] : undefined;

    if (!exceptionalHardshipValue) {
      return {};
    }

    return {
      exceptionalHardship: exceptionalHardshipValue,
      ...(exceptionalHardshipValue === 'yes' && householdCircumstances?.exceptionalHardshipDetails
        ? {
            'exceptionalHardship.exceptionalHardshipDetails': householdCircumstances.exceptionalHardshipDetails,
          }
        : {}),
    };
  },
});
