import type { YesNoNotSureValue } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep } from '../../../modules/steps';
import { formatDatePartsToISODate, parseISOToDateParts } from '../../utils';
import { getDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/populateResponseToClaimPayloadmap';
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

    if (existingDate) {
      result.alternativeAccommodationDate = parseISOToDateParts(existingDate);
    }

    return result;
  },
  beforeRedirect: async req => {
    const response = getDraftDefendantResponse(req);
    const confirmValue = req.body?.confirmAlternativeAccommodation as string | undefined;
    const enumMapping: Record<string, YesNoNotSureValue> = { yes: 'YES', no: 'NO', notSure: 'NOT_SURE' };

    if (confirmValue && enumMapping[confirmValue]) {
      response.defendantResponses.householdCircumstances.alternativeAccommodation = enumMapping[confirmValue];

      if (confirmValue === 'yes') {
        const day =
          (req.body?.['confirmAlternativeAccommodation.alternativeAccommodationDate-day'] as string | undefined) ?? '';
        const month =
          (req.body?.['confirmAlternativeAccommodation.alternativeAccommodationDate-month'] as string | undefined) ??
          '';
        const year =
          (req.body?.['confirmAlternativeAccommodation.alternativeAccommodationDate-year'] as string | undefined) ?? '';
        const isoDate = formatDatePartsToISODate(day, month, year);
        if (isoDate) {
          response.defendantResponses.householdCircumstances.alternativeAccommodationTransferDate = isoDate;
        }
      } else {
        delete response.defendantResponses.householdCircumstances.alternativeAccommodationTransferDate;
      }
    } else {
      delete response.defendantResponses.householdCircumstances.alternativeAccommodation;
      delete response.defendantResponses.householdCircumstances.alternativeAccommodationTransferDate;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
