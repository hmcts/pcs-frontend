import { format, parseISO } from 'date-fns';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getFormData, getTranslationFunction, setFormData } from '../../../modules/steps';
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
  beforeGet: async req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const existingDateIsCorrect = caseData?.possessionClaimResponse?.defendantResponses?.tenancyStartDateCorrect as
      | string
      | undefined;
    const existingTenancyStartDate = caseData?.possessionClaimResponse?.defendantResponses?.tenancyStartDate as
      | string
      | undefined;

    const existingDraftData = getFormData(req, 'tenancy-date-details');
    if (existingDateIsCorrect && !existingDraftData?.confirmTenancyDate && !req.body?.confirmTenancyDate) {
      const formValue =
        existingDateIsCorrect === 'YES'
          ? 'yes'
          : existingDateIsCorrect === 'NO'
            ? 'no'
            : existingDateIsCorrect === 'NOT_SURE'
              ? 'notSure'
              : undefined;

      if (formValue) {
        const draftData: Record<string, unknown> = { confirmTenancyDate: formValue };

        if (existingDateIsCorrect === 'NO' && existingTenancyStartDate) {
          const parsed = parseISO(existingTenancyStartDate);
          draftData.tenancyStartDate = {
            day: format(parsed, 'd'),
            month: format(parsed, 'M'),
            year: format(parsed, 'yyyy'),
          };
        }

        setFormData(req, 'tenancy-date-details', draftData);
      }
    }
  },
  beforeRedirect: async req => {
    const englandTenancyStartDate = req.res?.locals?.validatedCase?.data?.tenancy_TenancyLicenceDate as
      | string
      | undefined;
    const walesLicenceStartDate = req.res?.locals?.validatedCase?.data?.licenceStartDate as string | undefined;
    const existingStartDate = englandTenancyStartDate ?? walesLicenceStartDate;

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
    const claimantNameFromValidatedCase = req.res?.locals?.validatedCase?.data?.possessionClaimResponse
      ?.claimantOrganisations?.[0]?.value as string | undefined;

    const claimantNameFromSession = req.session?.ccdCase?.data?.claimantName as string | undefined;
    const claimantName = claimantNameFromValidatedCase || claimantNameFromSession;
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
