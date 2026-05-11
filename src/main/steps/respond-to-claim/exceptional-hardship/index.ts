import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { caseNumberFormatter } from '../../utils/caseNumberFormatter';
import { createRespondToClaimFormStep } from '../formStep';

import { getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { YesNoValue } from '@services/ccdCase.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'exceptional-hardship',
  stepDir: __dirname,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    hardshipHeading: 'hardshipHeading',
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
    const caseNumber = caseNumberFormatter(req.res?.locals?.validatedCase?.id as string);

    return {
      introParagraph1: t('introParagraph1'),
      introParagraph2: t('introParagraph2'),
      introParagraph3: t('introParagraph3'),
      forExample: t('forExample'),
      bullet1: t('bullet1'),
      bullet2: t('bullet2'),
      bullet3: t('bullet3'),
      bullet4: t('bullet4'),
      caseNumber: t('caseNumber', { caseNumber }),
    };
  },
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};
    const exceptionalHardshipValue = req.body?.exceptionalHardship as string | undefined;
    const ccdMapping: Record<string, YesNoValue> = { yes: 'YES', no: 'NO' };

    if (exceptionalHardshipValue && ccdMapping[exceptionalHardshipValue]) {
      response.defendantResponses.householdCircumstances.exceptionalHardship = ccdMapping[exceptionalHardshipValue];

      if (exceptionalHardshipValue === 'yes') {
        response.defendantResponses.householdCircumstances.exceptionalHardshipDetails = req.body?.[
          'exceptionalHardship.exceptionalHardshipDetails'
        ] as string | undefined;
      } else {
        delete response.defendantResponses.householdCircumstances.exceptionalHardshipDetails;
      }
    } else {
      delete response.defendantResponses.householdCircumstances.exceptionalHardship;
      delete response.defendantResponses.householdCircumstances.exceptionalHardshipDetails;
    }

    await saveDraftDefendantResponse(
      req,

      response
    );
  },
  getInitialFormData: req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const householdCircumstances = caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;
    const existingAnswer = householdCircumstances?.exceptionalHardship as string | undefined;

    const mapping: Record<string, string> = { YES: 'yes', NO: 'no' };
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
