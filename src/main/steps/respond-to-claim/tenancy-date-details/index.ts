import { format, parseISO } from 'date-fns';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { formatDatePartsToISODate } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import type { CcdCaseModel, PossessionClaimResponse } from '@interfaces/ccdCaseData.model';

function getTenancyStartDate(validatedCase?: CcdCaseModel): string | undefined {
  return validatedCase?.tenancyStartDate as string | undefined;
}

export const step: StepDefinition = createFormStep({
  stepName: 'tenancy-date-details',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/tenancyDateDetails.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    heading: 'heading',
    question: 'question',
    hintText: 'hintText',
    subHeading: 'subHeading',
    bulletPoint: 'bulletPoint',
  },
  fields: [
    {
      name: 'confirmTenancyDate',
      type: 'radio',
      required: true,
      translationKey: { label: 'question' },
      legendClasses: 'govuk-fieldset__legend--m',
      errorMessage: 'errors.confirmTenancyDate',
      options: [
        { value: 'yes', translationKey: 'options.yes' },
        {
          value: 'no',
          translationKey: 'options.no',
          subFields: {
            tenancyStartDate: {
              name: 'tenancyStartDate',
              type: 'date',
              required: false,
              noFutureDate: true,
              legendClasses: 'govuk-label--s govuk-!-font-weight-bold',
              translationKey: {
                label: 'dateLabel',
              },
            },
          },
        },
        { divider: 'options.or' },
        { value: 'notSure', translationKey: 'options.notSure' },
      ],
    },
  ],
  getInitialFormData: req => {
    const validatedCase = req.res?.locals?.validatedCase;
    const existingDateIsCorrect = validatedCase?.defendantResponsesTenancyStartDateCorrect as string | undefined;
    const existingTenancyStartDate = validatedCase?.defendantResponsesTenancyStartDate as string | undefined;

    if (!existingDateIsCorrect) {
      return {};
    }

    const formValue =
      existingDateIsCorrect === 'YES'
        ? 'yes'
        : existingDateIsCorrect === 'NO'
          ? 'no'
          : existingDateIsCorrect === 'NOT_SURE'
            ? 'notSure'
            : undefined;

    if (!formValue) {
      return {};
    }

    const initialData: Record<string, unknown> = { confirmTenancyDate: formValue };
    if (existingDateIsCorrect === 'NO' && existingTenancyStartDate) {
      const parsed = parseISO(existingTenancyStartDate);
      if (!Number.isNaN(parsed.getTime())) {
        initialData.tenancyStartDate = {
          day: format(parsed, 'd'),
          month: format(parsed, 'M'),
          year: format(parsed, 'yyyy'),
        };
      }
    }

    return initialData;
  },
  beforeRedirect: async req => {
    const validatedCase = req.res?.locals?.validatedCase;
    const existingStartDate = getTenancyStartDate(validatedCase);
    const confirmValue = req.body?.confirmTenancyDate as string | undefined;

    const defendantResponses: Record<string, unknown> = {};
    let tenancyStartDate: string | undefined;

    if (confirmValue === 'yes') {
      defendantResponses.tenancyStartDateCorrect = 'YES';
      tenancyStartDate = existingStartDate;
    } else if (confirmValue === 'no') {
      defendantResponses.tenancyStartDateCorrect = 'NO';
      const day = (req.body?.['confirmTenancyDate.tenancyStartDate-day'] as string | undefined) ?? '';
      const month = (req.body?.['confirmTenancyDate.tenancyStartDate-month'] as string | undefined) ?? '';
      const year = (req.body?.['confirmTenancyDate.tenancyStartDate-year'] as string | undefined) ?? '';
      tenancyStartDate = formatDatePartsToISODate(day, month, year) ?? undefined;
    } else if (confirmValue === 'notSure') {
      defendantResponses.tenancyStartDateCorrect = 'NOT_SURE';
      tenancyStartDate = ' ';
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        ...defendantResponses,
        ...(tenancyStartDate && { tenancyStartDate }),
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  extendGetContent: req => {
    const validatedCase = req.res?.locals?.validatedCase;
    const claimantName = validatedCase?.claimantName as string | undefined;
    const existingStartDate = getTenancyStartDate(validatedCase);

    // Format tenancy date with ordinal
    const tenancyStartDate = existingStartDate ? format(parseISO(existingStartDate), 'do LLLL yyyy') : undefined;

    const t = getTranslationFunction(req, 'tenancy-date-details', ['common']);
    const bulletPoint = t('bulletPoint', { returnObjects: true, tenancyStartDate });
    const subHeading = t('subHeading', { returnObjects: true, claimantName });

    return {
      claimantName,
      tenancyStartDate,
      bulletPoint,
      subHeading,
    };
  },
});
