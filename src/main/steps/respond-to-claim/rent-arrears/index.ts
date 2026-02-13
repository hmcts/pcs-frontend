import type { Request } from 'express';

import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { currency } from '../../../modules/nunjucks/filters/currency';
import { createFormStep, getTranslationFunction } from '../../../modules/steps';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'rent-arrears',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/rentArrears.njk`,
  translationKeys: {
    caption: 'captionHeading',
  },
  extendGetContent: (req: Request) => {
    // Pull dynamic claimantName from CCD (same as dispute-claim-interstitial)
    const claimantName = (req.session?.ccdCase?.data?.claimantName as string) || 'Treetops Housing';
    const amount = (req.session?.ccdCase?.data?.rentArrearsAmountOnStatement as number) || 3250.0;
    const rentArrearsAmount = currency(amount);

    const t = getTranslationFunction(req, 'rent-arrears', ['common']);

    // i18next automatically interpolates variables and applies formatters in translation strings
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
              // Require a numeric amount in 00.00 format
              pattern: '^\\d{1,10}\\.\\d{2}$',
              errorMessage: 'errors.rentArrears.rentArrearsAmount',
              translationKey: {
                label: 'rentArrearsAmountCorrection.label',
              },
              classes: 'govuk-input--width-10',
              prefix: {
                text: '£',
              },
              attributes: {
                inputmode: 'decimal',
                spellcheck: false,
              },
              // Enforce maximum of £1,000,000,000.00
              validator: value => {
                if (typeof value !== 'string') {
                  return false;
                }
                const trimmed = value.trim();
                if (!trimmed) {
                  return false;
                }
                const match = trimmed.match(/^(\d{1,10})\.(\d{2})$/);
                if (!match) {
                  return false;
                }
                const numericValue = Number(trimmed);
                if (Number.isNaN(numericValue)) {
                  return false;
                }
                // Upper limit £1,000,000,000.00
                return numericValue <= 1000000000;
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
