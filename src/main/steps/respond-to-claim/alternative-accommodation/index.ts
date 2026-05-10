import { createFormStep } from '../../../modules/steps';
import { formatDatePartsToISODate, fromYesNoNotSureEnum, parseISOToDateParts, toYesNoNotSureEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

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
    const existing = caseData?.alternativeAccommodation;
    const existingDate = caseData?.alternativeAccommodationTransferDate;

    const formValue = fromYesNoNotSureEnum(existing);

    const result: Record<string, unknown> = { confirmAlternativeAccommodation: formValue };

    if (existingDate) {
      result.alternativeAccommodationDate = parseISOToDateParts(existingDate);
    }

    return result;
  },
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};
    const confirmValue = req.body?.confirmAlternativeAccommodation as string | undefined;
    const enumValue = toYesNoNotSureEnum(confirmValue);

    if (enumValue) {
      response.defendantResponses.householdCircumstances.alternativeAccommodation = enumValue;

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

    await saveDraftDefendantResponse(
      req,

      response
    );
  },
});
