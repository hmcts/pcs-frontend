import type { Request } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { currency } from '../../../modules/nunjucks/filters/currency';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { buildDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import { ccdCaseService } from '@services/ccdCaseService';

// Validation constants
const MAX_RENT_ARREARS_AMOUNT = 1_000_000_000; // £1 billion maximum
const AMOUNT_FORMAT_REGEX = /^\d{1,10}\.\d{2}$/; // Up to 10 digits, exactly 2 decimal places

// Backend enum mappings
const BACKEND_CONFIRMATION = {
  YES: 'YES',
  NO: 'NO',
  NOT_SURE: 'NOT_SURE',
} as const;

// Frontend form values
const FORM_VALUES = {
  YES: 'yes',
  NO: 'no',
  NOT_SURE: 'notSure',
} as const;

export const step: StepDefinition = createFormStep({
  stepName: 'rent-arrears-dispute',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/rentArrearsDispute.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'captionHeading',
  },
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    const rentArrears = req.body?.rentArrears as 'yes' | 'no' | 'notSure' | undefined;
    const enumMapping: Record<string, string> = {
      [FORM_VALUES.YES]: BACKEND_CONFIRMATION.YES,
      [FORM_VALUES.NO]: BACKEND_CONFIRMATION.NO,
      [FORM_VALUES.NOT_SURE]: BACKEND_CONFIRMATION.NOT_SURE,
    };

    if (rentArrears && enumMapping[rentArrears]) {
      response.defendantResponses.rentArrearsAmountConfirmation = enumMapping[rentArrears];

      if (rentArrears === FORM_VALUES.NO) {
        const amountRaw = req.body?.['rentArrears.rentArrearsAmountCorrection'] as string | undefined;
        if (amountRaw) {
          const normalized = amountRaw.replace(/,/g, '');
          const amountInPounds = parseFloat(normalized);
          if (!Number.isNaN(amountInPounds)) {
            response.defendantResponses.rentArrearsAmount = String(Math.round(amountInPounds * 100));
          }
        }
      } else {
        delete response.defendantResponses.rentArrearsAmount;
      }
    } else {
      delete response.defendantResponses.rentArrearsAmountConfirmation;
      delete response.defendantResponses.rentArrearsAmount;
    }

    await ccdCaseService.saveDraftDefendantResponse(
      req.session?.user?.accessToken,
      req.res?.locals.validatedCase?.id,
      response
    );
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const response = caseData?.possessionClaimResponse?.defendantResponses;

    if (!response?.rentArrearsAmountConfirmation) {
      return {};
    }

    const formData: Record<string, unknown> = {};

    // Map backend enum to frontend radio value
    if (response.rentArrearsAmountConfirmation === BACKEND_CONFIRMATION.YES) {
      formData.rentArrears = FORM_VALUES.YES;
    } else if (response.rentArrearsAmountConfirmation === BACKEND_CONFIRMATION.NO) {
      formData.rentArrears = FORM_VALUES.NO;
      // Prepopulate the amount if it exists (convert pence to pounds)
      // Use dotted notation for subField, matching defendant-name-confirmation pattern
      if (response.rentArrearsAmount) {
        const amountInPence = parseFloat(response.rentArrearsAmount as string);
        const amountInPounds = amountInPence / 100;
        formData['rentArrears.rentArrearsAmountCorrection'] = amountInPounds.toFixed(2);
      }
    } else if (response.rentArrearsAmountConfirmation === BACKEND_CONFIRMATION.NOT_SURE) {
      formData.rentArrears = FORM_VALUES.NOT_SURE;
    }

    return formData;
  },
  extendGetContent: (req: Request) => {
    const caseData = req.res?.locals.validatedCase?.data;
    const claimantName = caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value as string | undefined;
    const amountInPence = (caseData?.rentArrears_Total as string | number) || 0;
    const amountInPounds = typeof amountInPence === 'string' ? parseFloat(amountInPence) / 100 : amountInPence / 100;
    const rentArrearsAmount = currency(amountInPounds);

    const t = getTranslationFunction(req, 'rent-arrears-dispute', ['common']);

    const insetIntroText = t('insetIntroText');
    const insetDetailsText = t('insetDetailsText', { claimantName });
    const insetConditionalYesText = t('insetConditionalYesText');
    const amountOwedHeading = t('amountOwedHeading', { claimantName });
    const rentArrearsAmountCorrection = t('rentArrearsAmountCorrection');
    return {
      insetIntroText,
      insetDetailsText,
      insetConditionalYesText,
      amountOwedHeading,
      rentArrearsAmount,
      rentArrearsAmountCorrection,
    };
  },
  fields: [
    {
      name: 'rentArrears',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'rentArrearsQuestion',
      },
      legendClasses: 'govuk-fieldset__legend--m',
      options: [
        {
          value: 'yes',
          translationKey: 'rentArrearsOptions.yes',
        },
        {
          value: 'no',
          translationKey: 'rentArrearsOptions.no',
          subFields: {
            rentArrearsAmountCorrection: {
              name: 'rentArrearsAmountCorrection',
              type: 'text',
              required: true,
              translationKey: {
                label: 'rentArrearsAmountCorrection.label',
                hint: 'rentArrearsAmountCorrection.hint',
              },
              classes: 'govuk-input--width-10',
              prefix: {
                text: '£',
              },
              attributes: {
                inputmode: 'decimal',
                spellcheck: false,
              },
              validator: (value: unknown): boolean | string => {
                if (typeof value !== 'string') {
                  return true;
                }

                const trimmed = value.trim();
                if (!trimmed) {
                  return true;
                } // Let required validation handle empty values

                const normalized = trimmed.replace(/,/g, '');
                const numericValue = parseFloat(normalized);

                if (!Number.isNaN(numericValue)) {
                  if (numericValue < 0) {
                    return 'errors.rentArrearsAmountCorrection.negativeAmount';
                  }
                  if (numericValue > MAX_RENT_ARREARS_AMOUNT) {
                    return 'errors.rentArrearsAmountCorrection.largeAmount';
                  }
                }

                if (!AMOUNT_FORMAT_REGEX.test(normalized)) {
                  return 'errors.rentArrearsAmountCorrection.invalidFormat';
                }

                return true;
              },
            },
          },
        },
        { divider: 'rentArrearsOptions.or', translationKey: 'rentArrearsOptions.or' },
        { value: 'notSure', translationKey: 'rentArrearsOptions.notSure' },
      ],
    },
  ],
});
