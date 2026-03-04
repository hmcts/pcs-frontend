import { format, parseISO } from 'date-fns';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { formatDatePartsToISODate } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'tenancy-date-details',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/tenancyDateDetails.njk`,
  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
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
              required: true,
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
  beforeRedirect: async req => {
    const originalTenancyStartDate = req.res?.locals?.validatedCase?.data?.tenancy_TenancyLicenceDate as
      | string
      | undefined;
    const confirmValue = req.body?.confirmTenancyDate as string | undefined;

    const defendantResponses: Record<string, unknown> = {};
    let tenancyStartDate: string | undefined;

    if (confirmValue === 'yes') {
      defendantResponses.tenancyStartDateCorrect = 'YES';
      tenancyStartDate = originalTenancyStartDate;
    } else if (confirmValue === 'no') {
      defendantResponses.tenancyStartDateCorrect = 'NO';
      const day = (req.body?.['confirmTenancyDate.tenancyStartDate-day'] as string | undefined) ?? '';
      const month = (req.body?.['confirmTenancyDate.tenancyStartDate-month'] as string | undefined) ?? '';
      const year = (req.body?.['confirmTenancyDate.tenancyStartDate-year'] as string | undefined) ?? '';
      tenancyStartDate = formatDatePartsToISODate(day, month, year) ?? undefined;
    } else if (confirmValue === 'notSure') {
      defendantResponses.tenancyStartDateCorrect = 'NOT_SURE';
      tenancyStartDate = originalTenancyStartDate;
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
    const claimantNameFromValidatedCase = req.res?.locals?.validatedCase?.data?.possessionClaimResponse
      ?.claimantOrganisations?.[0]?.value as string | undefined;

    const claimantNameFromSession = req.session?.ccdCase?.data?.claimantName as string | undefined;

    const claimantName = claimantNameFromValidatedCase || claimantNameFromSession || 'Treetops housing';

    const rawTenancyDate = req.res?.locals?.validatedCase?.data?.tenancy_TenancyLicenceDate as string | undefined;

    // Format tenancy date with ordinal
    const tenancyStartDate = rawTenancyDate ? format(parseISO(rawTenancyDate), 'do LLLL yyyy') : undefined;

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
