import type { Request } from 'express';

import type { FormFieldConfig } from '../../../interfaces/formFieldConfig.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { currency } from '../../../modules/nunjucks/filters/currency';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { getClaimantName } from '../../utils';
import { flowConfig } from '../flow.config';

// Define fields separately so we can dynamically inject validator
const fieldsConfig: FormFieldConfig[] = [
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
          },
        },
      },
      { divider: 'rentArrearsOptions.or', translationKey: 'rentArrearsOptions.or' },
      { value: 'notSure', translationKey: 'rentArrearsOptions.notSure' },
    ],
  },
];

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
  ccdMapping: {
    backendPath: 'possessionClaimResponse.defendantResponses',
    frontendFields: ['rentArrears', 'rentArrears.rentArrearsAmountCorrection'],
    valueMapper: (formData, _ctx) => {
      // Handle single value case (shouldn't happen for this step, but for type safety)
      if (typeof formData === 'string' || Array.isArray(formData)) {
        return {};
      }

      const rentArrears = formData.rentArrears as 'yes' | 'no' | 'notSure' | undefined;
      const amountRaw = formData['rentArrears.rentArrearsAmountCorrection'] as string | undefined;

      const result: Record<string, unknown> = {};

      // Map frontend radio value to backend enum
      if (rentArrears === 'yes') {
        result.oweRentArrears = 'YES';
      } else if (rentArrears === 'no') {
        result.oweRentArrears = 'NO';
        // Convert pounds to pence (backend stores as pence string)
        if (amountRaw) {
          const normalized = amountRaw.replace(/,/g, ''); // Remove comma separators
          const amountInPounds = parseFloat(normalized);
          if (!Number.isNaN(amountInPounds)) {
            result.rentArrearsAmount = String(Math.round(amountInPounds * 100));
          }
        }
      } else if (rentArrears === 'notSure') {
        result.oweRentArrears = 'NOT_SURE';
      }

      return result;
    },
  },
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const response = caseData?.possessionClaimResponse?.defendantResponses;

    if (!response?.oweRentArrears) {
      return {};
    }

    const formData: Record<string, unknown> = {};

    // Map backend enum to frontend radio value
    if (response.oweRentArrears === 'YES') {
      formData.rentArrears = 'yes';
    } else if (response.oweRentArrears === 'NO') {
      formData.rentArrears = 'no';
      // Prepopulate the amount if it exists (convert pence to pounds)
      if (response.rentArrearsAmount) {
        const amountInPence = parseFloat(response.rentArrearsAmount as string);
        const amountInPounds = amountInPence / 100;
        formData['rentArrears.rentArrearsAmountCorrection'] = amountInPounds.toFixed(2);
      }
    } else if (response.oweRentArrears === 'NOT_SURE') {
      formData.rentArrears = 'notSure';
    }

    return formData;
  },
  extendGetContent: (req: Request) => {
    const claimantName = getClaimantName(req);

    const caseData = req.res?.locals.validatedCase?.data;
    const amountInPence = (caseData?.rentArrears_Total as string | number) || 0;
    const amountInPounds = typeof amountInPence === 'string' ? parseFloat(amountInPence) / 100 : amountInPence / 100;
    const rentArrearsAmount = currency(amountInPounds);

    const t = getTranslationFunction(req, 'rent-arrears-dispute', ['common']);

    // Dynamically inject validator with translation function (following postcode pattern)
    const rentArrearsField = fieldsConfig[0];
    const noOption = rentArrearsField.options?.find(opt => opt.value === 'no');
    const amountField = noOption?.subFields?.rentArrearsAmountCorrection;

    if (amountField) {
      amountField.validator = (value: unknown): boolean | string => {
        if (typeof value !== 'string') {return true;}

        const trimmed = value.trim();
        if (!trimmed) {return true;} // Let required validation handle empty values

        // Remove commas to handle user input like 1,234.56
        const normalized = trimmed.replace(/,/g, '');
        const numericValue = parseFloat(normalized);

        // Range validation
        if (!Number.isNaN(numericValue)) {
          if (numericValue < 0) {
            return t('errors.rentArrearsAmountCorrection.negativeAmount');
          }
          if (numericValue > 1000000000) {
            return t('errors.rentArrearsAmountCorrection.largeAmount');
          }
        }

        // Format validation: 1-10 digits, decimal point, exactly 2 decimal places
        const formatRegex = /^\d{1,10}\.\d{2}$/;
        if (!formatRegex.test(normalized)) {
          return t('errors.rentArrearsAmountCorrection.invalidFormat');
        }

        return true;
      };
    }

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
  fields: fieldsConfig,
});
