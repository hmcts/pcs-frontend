import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

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
                const validCharacters = /^[a-zA-Z\u00C0-\u024F\d\s\-'.,!?()&\n\r]+$/;
                return validCharacters.test(value) || 'errors.otherAdultsDetailsInvalidCharacters';
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
    const householdCircumstances: Record<string, unknown> = {};
    const details = req.body?.['confirmOtherAdults.otherAdultsDetails'] as string | undefined;

    if (confirmValue === 'yes') {
      householdCircumstances.otherTenants = 'YES';
      householdCircumstances.otherTenantsDetails = details;
    } else if (confirmValue === 'no') {
      householdCircumstances.otherTenants = 'NO';
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
