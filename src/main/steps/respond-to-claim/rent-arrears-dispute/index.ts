import type { Request } from 'express';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { currency } from '../../../modules/nunjucks/filters/currency';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'rent-arrears-dispute',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/rentArrears.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'captionHeading',
  },
  beforeRedirect: async req => {
    const rentArrears = req.body?.rentArrears as 'yes' | 'no' | 'notSure' | undefined;
    const amountRaw = req.body?.['rentArrears.rentArrearsAmountCorrection'] as string | undefined;

    if (!rentArrears) {
      return;
    }

    const result: Record<string, unknown> = {};

    // Map frontend radio value to backend enum
    if (rentArrears === 'yes') {
      result.rentArrearsAmountConfirmation = 'YES';
    } else if (rentArrears === 'no') {
      result.rentArrearsAmountConfirmation = 'NO';
      // Convert pounds to pence (backend stores as pence string via MoneyGBP serializer)
      if (amountRaw) {
        const normalized = amountRaw.replace(/,/g, ''); // Remove comma separators
        const amountInPounds = parseFloat(normalized);
        if (!Number.isNaN(amountInPounds)) {
          result.rentArrearsAmount = String(Math.round(amountInPounds * 100));
        }
      }
    } else if (rentArrears === 'notSure') {
      result.rentArrearsAmountConfirmation = 'NOT_SURE';
    }

    if (Object.keys(result).length === 0) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: result,
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const response = caseData?.possessionClaimResponse?.defendantResponses;

    if (!response?.rentArrearsAmountConfirmation) {
      return {};
    }

    const formData: Record<string, unknown> = {};

    // Map backend enum to frontend radio value
    if (response.rentArrearsAmountConfirmation === 'YES') {
      formData.rentArrears = 'yes';
    } else if (response.rentArrearsAmountConfirmation === 'NO') {
      formData.rentArrears = 'no';
      // Prepopulate the amount if it exists (convert pence to pounds)
      // Use dotted notation for subField, matching defendant-name-confirmation pattern
      if (response.rentArrearsAmount) {
        const amountInPence = parseFloat(response.rentArrearsAmount as string);
        const amountInPounds = amountInPence / 100;
        formData['rentArrears.rentArrearsAmountCorrection'] = amountInPounds.toFixed(2);
      }
    } else if (response.rentArrearsAmountConfirmation === 'NOT_SURE') {
      formData.rentArrears = 'notSure';
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
                  if (numericValue > 1000000000) {
                    return 'errors.rentArrearsAmountCorrection.largeAmount';
                  }
                }

                const formatRegex = /^\d{1,10}\.\d{2}$/;
                if (!formatRegex.test(normalized)) {
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
