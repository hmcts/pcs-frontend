import type { Request } from 'express';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { currency } from '../../../modules/nunjucks/filters/currency';
import { createFormStep, getTranslationFunction, validateCurrencyAmount } from '../../../modules/steps';
import { getClaimantName } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse as buildAndSubmitPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

export const step: StepDefinition = createFormStep({
  stepName: 'rent-arrears-dispute',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/rentArrears.njk`,
  translationKeys: {
    caption: 'captionHeading',
  },
  beforeRedirect: async (req: Request) => {
    const oweRentArrearsRaw = req.body?.rentArrears as 'yes' | 'no' | 'notSure' | undefined;
    const rentArrearsAmountRaw = req.body?.rentArrearsAmountCorrection as string | undefined;

    // Convert lowercase enum to uppercase format expected by CCD (YES, NO, NOT_SURE)
    const oweRentArrears =
      oweRentArrearsRaw === 'yes'
        ? 'YES'
        : oweRentArrearsRaw === 'no'
          ? 'NO'
          : oweRentArrearsRaw === 'notSure'
            ? 'NOT_SURE'
            : undefined;

    // Convert currency from pounds to pence (e.g., "155.00" -> 15500)
    let rentArrearsAmount: number | undefined;
    if (rentArrearsAmountRaw) {
      const amountInPounds = parseFloat(rentArrearsAmountRaw.replace(/,/g, ''));
      rentArrearsAmount = Math.round(amountInPounds * 100);
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        oweRentArrears,
        ...(rentArrearsAmount !== undefined && { rentArrearsAmount }),
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse, true);
  },
  extendGetContent: (req: Request) => {
    // Pull dynamic claimantName from CCD - check multiple sources for robustness
    const claimantName = getClaimantName(req);

    // TO DO: Retrieve amount from CCD
    const amount = (req.session?.ccdCase?.data?.rentArrearsAmountOnStatement as number) || 3250.0;
    const rentArrearsAmount = currency(amount);

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
              errorMessage: 'errors.rentArrears.rentArrearsAmount',
              translationKey: {
                label: 'rentArrearsAmountCorrection.label',
                hint: 'rentArrearsAmountCorrection.hint',
              },
              classes: 'govuk-input--width-10',
              prefix: {
                text: '£',
              },
              attributes: {
                inputmode: 'text',
                spellcheck: false,
              },
              // Reusable currency validation with page-specific error messages
              validate: value =>
                validateCurrencyAmount(value, {
                  max: 1000000000,
                  min: 0,
                  errorPrefix: 'errors.rentArrears',
                }),
            },
          },
        },
        { divider: 'rentArrearsOptions.or', translationKey: 'rentArrearsOptions.or' },
        { value: 'notSure', translationKey: 'rentArrearsOptions.notSure' },
      ],
    },
  ],
});
