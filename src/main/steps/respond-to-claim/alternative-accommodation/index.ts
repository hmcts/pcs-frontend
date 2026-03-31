import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { formatDatePartsToISODate, parseISOToDateParts } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'would-you-have-somewhere-else-to-live-if-you-had-to-leave-your-home',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/alternativeAccommodation.njk`,
  translationKeys: {
    caption: 'caption',
    question: 'question',
    pageTitle: 'pageTitle',
  },
  fields: [
    {
      name: 'confirmAlternativeAccommodation',
      type: 'radio',
      required: true,
      isPageHeading: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--l',
      errorMessage: 'errors.confirmAlternativeAccommodation',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          subFields: {
            alternativeAccommodationDate: {
              name: 'alternativeAccommodationDate',
              type: 'date',
              required: false,
              noPastDate: true,
              legendClasses: 'govuk-label--s govuk-!-font-weight-bold',
              translationKey: {
                label: 'dateLabel',
              },
            },
          },
        },
        { value: 'no', translationKey: 'options.no' },
        { divider: 'options.or' },
        { value: 'notSure', translationKey: 'options.notSure' },
      ],
    },
  ],
  getInitialFormData: req => {
    const caseData =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.householdCircumstances;
    const existing = caseData?.alternativeAccommodation as string | undefined;
    const existingDate = caseData?.alternativeAccommodationTransferDate as string | undefined;

    const mapping: Record<string, string> = { YES: 'yes', NO: 'no', NOT_SURE: 'notSure' };
    const formValue = existing ? mapping[existing] : undefined;

    const result: Record<string, unknown> = { confirmAlternativeAccommodation: formValue };

    if (formValue === 'yes' && existingDate) {
      result.alternativeAccommodationDate = parseISOToDateParts(existingDate);
    }

    return result;
  },
  beforeRedirect: async req => {
    const confirmValue = req.body?.confirmAlternativeAccommodation as string | undefined;

    const householdCircumstances: Record<string, unknown> = {};

    if (confirmValue === 'yes') {
      householdCircumstances.alternativeAccommodation = 'YES';
      const day =
        (req.body?.['confirmAlternativeAccommodation.alternativeAccommodationDate-day'] as string | undefined) ?? '';
      const month =
        (req.body?.['confirmAlternativeAccommodation.alternativeAccommodationDate-month'] as string | undefined) ?? '';
      const year =
        (req.body?.['confirmAlternativeAccommodation.alternativeAccommodationDate-year'] as string | undefined) ?? '';
      const isoDate = formatDatePartsToISODate(day, month, year);
      if (isoDate) {
        householdCircumstances.alternativeAccommodationTransferDate = isoDate;
      }
    } else if (confirmValue === 'no') {
      householdCircumstances.alternativeAccommodation = 'NO';
    } else if (confirmValue === 'notSure') {
      householdCircumstances.alternativeAccommodation = 'NOT_SURE';
    }
    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
