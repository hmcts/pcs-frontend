import { createFormStep } from '../../../modules/steps';
import { buildDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { ccdCaseService } from '@services/ccdCaseService';

export const step: StepDefinition = createFormStep({
  stepName: 'do-any-other-adults-live-in-your-home',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/otherAdults.njk`,
  translationKeys: {
    question: 'question',
    caption: 'caption',
    pageTitle: 'pageTitle',
  },
  fields: [
    {
      name: 'confirmOtherAdults',
      type: 'radio',
      required: true,
      isPageHeading: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: {
        label: 'question',
      },
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            otherAdultsDetails: {
              name: 'otherAdultsDetails',
              type: 'character-count',
              maxLength: 500,
              required: true,
              errorMessage: 'errors.otherAdultsDetails',
              labelClasses: 'govuk-label--s govuk-!-font-weight-bold',
              translationKey: {
                label: 'textAreaLabel',
                hint: 'textAreaHintText',
              },
              validator: (value): boolean | string => {
                if (typeof value !== 'string' || !value.trim()) {
                  return true;
                }
                const invalidCharacters = /\p{Extended_Pictographic}|\u200D|\uFE0F/u;
                return !invalidCharacters.test(value) || 'errors.otherAdultsDetailsInvalidCharacters';
              },
            },
          },
        },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
  getInitialFormData: req => {
    const caseData =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.householdCircumstances;
    const existingRadioValue = caseData?.otherTenants as string | undefined;
    const existingDetails = caseData?.otherTenantsDetails as string | undefined;

    const mapping: Record<string, string> = { Yes: 'yes', No: 'no' };
    const formValue = existingRadioValue ? mapping[existingRadioValue] : undefined;

    const result: Record<string, unknown> = { confirmOtherAdults: formValue };
    if (existingDetails) {
      result['confirmOtherAdults.otherAdultsDetails'] = existingDetails;
    }

    return result;
  },
  beforeRedirect: async req => {
    const confirmValue = req.body?.confirmOtherAdults as string | undefined;

    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};

    if (confirmValue === 'yes' || confirmValue === 'no') {
      response.defendantResponses.householdCircumstances.otherTenants = confirmValue === 'yes' ? 'YES' : 'NO';

      if (confirmValue === 'yes') {
        response.defendantResponses.householdCircumstances.otherTenantsDetails = req.body?.[
          'confirmOtherAdults.otherAdultsDetails'
        ] as string | undefined;
      } else {
        delete response.defendantResponses.householdCircumstances.otherTenantsDetails;
      }
    } else {
      delete response.defendantResponses.householdCircumstances.otherTenants;
      delete response.defendantResponses.householdCircumstances.otherTenantsDetails;
    }

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id || '',
      response
    );
  },
});
