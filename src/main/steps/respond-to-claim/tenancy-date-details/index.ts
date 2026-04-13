import { format, parseISO } from 'date-fns';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { createFormStep, getFormData, getTranslationFunction, setFormData } from '../../../modules/steps';
import { formatDatePartsToISODate } from '../../utils';
import { getDraftDefendantResponse } from '../../utils/getDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { ccdCaseService } from '@services/ccdCaseService';

function getTenancyStartDate(caseData: Record<string, unknown> | undefined): string | undefined {
  return (caseData?.tenancy_TenancyLicenceDate ?? caseData?.licenceStartDate) as string | undefined;
}

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
    const confirmValue = req.body?.confirmTenancyDate as string | undefined;

    const response = getDraftDefendantResponse(req);
    const enumMapping: Record<string, string> = { yes: 'YES', no: 'NO', notSure: 'NOT_SURE' };

    if (confirmValue && enumMapping[confirmValue]) {
      response.defendantResponses.tenancyStartDateCorrect = enumMapping[confirmValue];

      if (confirmValue === 'yes') {
        const caseData = req.res?.locals?.validatedCase?.data;
        const existingStartDate = getTenancyStartDate(caseData);
        if (existingStartDate) {
          response.defendantResponses.tenancyStartDate = existingStartDate;
        } else {
          delete response.defendantResponses.tenancyStartDate;
        }
      } else if (confirmValue === 'no') {
        const day = (req.body?.['confirmTenancyDate.tenancyStartDate-day'] as string | undefined) ?? '';
        const month = (req.body?.['confirmTenancyDate.tenancyStartDate-month'] as string | undefined) ?? '';
        const year = (req.body?.['confirmTenancyDate.tenancyStartDate-year'] as string | undefined) ?? '';
        const correctedDate = formatDatePartsToISODate(day, month, year);
        if (correctedDate) {
          response.defendantResponses.tenancyStartDate = correctedDate;
        } else {
          delete response.defendantResponses.tenancyStartDate;
        }
      } else {
        response.defendantResponses.tenancyStartDate = ' ';
      }
    } else {
      delete response.defendantResponses.tenancyStartDateCorrect;
      delete response.defendantResponses.tenancyStartDate;
    }

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id,
      response
    );
  },
  extendGetContent: req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const claimantNameFromValidatedCase = caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as
      | string
      | undefined;
    const claimantNameFromSession = caseData?.claimantName as string | undefined;
    const claimantName = claimantNameFromValidatedCase || claimantNameFromSession;
    const existingStartDate = getTenancyStartDate(caseData);

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
