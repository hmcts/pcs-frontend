import type { Request } from 'express';

import { currency } from '../../../modules/nunjucks/filters/currency';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { fromYesNoNotSureEnum, penceToPounds, poundsToPence, toYesNoNotSureEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { flowConfig } from '../flow.config';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

// Validation constants
const MAX_RENT_ARREARS_AMOUNT = 1_000_000_000; // £1 billion maximum
const AMOUNT_FORMAT_REGEX = /^\d{1,10}\.\d{2}$/; // Up to 10 digits, exactly 2 decimal places

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
    const rentArrears = req.body?.rentArrears as string | undefined;
    const enumValue = toYesNoNotSureEnum(rentArrears);

    if (enumValue) {
      response.defendantResponses.rentArrearsAmountConfirmation = enumValue;

      if (rentArrears === 'no') {
        const amountInPence = poundsToPence(
          req.body?.['rentArrears.rentArrearsAmountCorrection'] as string | undefined
        );
        if (amountInPence !== undefined) {
          response.defendantResponses.rentArrearsAmount = amountInPence;
        }
      } else {
        delete response.defendantResponses.rentArrearsAmount;
      }
    } else {
      delete response.defendantResponses.rentArrearsAmountConfirmation;
      delete response.defendantResponses.rentArrearsAmount;
    }

    await saveDraftDefendantResponse(req, response);
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const response = caseData?.possessionClaimResponse?.defendantResponses;
    const formValue = fromYesNoNotSureEnum(response?.rentArrearsAmountConfirmation);

    if (!formValue) {
      return {};
    }

    const formData: Record<string, unknown> = { rentArrears: formValue };

    if (formValue === 'no' && response?.rentArrearsAmount) {
      // dotted notation matches subField rendering pattern
      formData['rentArrears.rentArrearsAmountCorrection'] = penceToPounds(response.rentArrearsAmount as string);
    }

    return formData;
  },
  extendGetContent: (req: Request) => {
    const caseData = req.res?.locals.validatedCase?.data;
    const claimantName = caseData?.possessionClaimResponse?.claimantOrganisations?.[0]?.value;
    const amountInPence = (caseData?.rentArrears_Total as string | number) || 0;
    const amountInPounds = typeof amountInPence === 'string' ? parseFloat(amountInPence) / 100 : amountInPence / 100;
    const rentArrearsAmount = currency(amountInPounds);

    const t = getTranslationFunction(req);

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
