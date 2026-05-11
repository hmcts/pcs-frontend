import { format, parseISO } from 'date-fns';
import type { Request } from 'express';

import { getTranslationFunction } from '../../../modules/steps';
import { formatDatePartsToISODate, fromYesNoNotSureEnum, toYesNoNotSureEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { caseNumberFormatter } from '../../utils/caseNumberFormatter';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCaseData } from '@services/ccdCase.interface';

function getTenancyStartDate(caseData: CcdCaseData | undefined): string | undefined {
  return caseData?.tenancy_TenancyLicenceDate ?? caseData?.licenceStartDate;
}

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'tenancy-date-details',
  stepDir: __dirname,
  customTemplate: `${__dirname}/tenancyDateDetails.njk`,
  translationKeys: {
    caption: 'caption',
    pageTitle: 'pageTitle',
    caseNumber: 'caseNumber',
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
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const existingDateIsCorrect = caseData?.possessionClaimResponse?.defendantResponses?.tenancyStartDateCorrect;
    const existingTenancyStartDate = caseData?.possessionClaimResponse?.defendantResponses?.tenancyStartDate;

    const formValue = fromYesNoNotSureEnum(existingDateIsCorrect);
    if (!formValue) {
      return {};
    }

    const result: Record<string, unknown> = { confirmTenancyDate: formValue };

    if (existingDateIsCorrect === 'NO' && existingTenancyStartDate) {
      const parsed = parseISO(existingTenancyStartDate);
      result.tenancyStartDate = {
        day: format(parsed, 'd'),
        month: format(parsed, 'M'),
        year: format(parsed, 'yyyy'),
      };
    }

    return result;
  },
  beforeRedirect: async req => {
    const confirmValue = req.body?.confirmTenancyDate as string | undefined;

    const response = buildDraftDefendantResponse(req);
    const enumValue = toYesNoNotSureEnum(confirmValue);

    if (enumValue) {
      response.defendantResponses.tenancyStartDateCorrect = enumValue;

      if (confirmValue === 'no') {
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
        delete response.defendantResponses.tenancyStartDate;
      }
    } else {
      delete response.defendantResponses.tenancyStartDateCorrect;
      delete response.defendantResponses.tenancyStartDate;
    }

    await saveDraftDefendantResponse(
      req,

      response
    );
  },
  extendGetContent: req => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const claimantNameFromValidatedCase = caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value;
    const claimantNameFromSession = caseData?.claimantName;
    const claimantName = claimantNameFromValidatedCase || claimantNameFromSession;
    const existingStartDate = getTenancyStartDate(caseData);

    // Format tenancy date with ordinal
    const tenancyStartDate = existingStartDate ? format(parseISO(existingStartDate), 'do LLLL yyyy') : undefined;

    const t = getTranslationFunction(req, 'tenancy-date-details', ['common']);
    const bulletPoint = t('bulletPoint', { returnObjects: true, tenancyStartDate });
    const subHeading = t('subHeading', { returnObjects: true, claimantName });
    const caseNumber = caseNumberFormatter(req.res?.locals?.validatedCase?.id as string);

    return {
      claimantName,
      caseNumber: t('caseNumber', { caseNumber }),
      tenancyStartDate,
      bulletPoint,
      subHeading,
    };
  },
});
