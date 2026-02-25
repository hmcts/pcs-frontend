import type { Request } from 'express';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { currency } from '../../../modules/nunjucks/filters/currency';
import { createFormStep, getTranslationFunction, validateCurrencyAmount } from '../../../modules/steps';
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
    const oweRentArrears = req.body?.rentArrears as 'yes' | 'no' | 'notSure' | undefined;
    const rentArrearsAmount = req.body?.['rentArrears.rentArrearsAmountCorrection'] as string | undefined;

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        oweRentArrears,
        ...(rentArrearsAmount && { rentArrearsAmount }),
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse, true);
  },
  extendGetContent: (req: Request) => {
    // Pull dynamic claimantName from CCD
    const claimantName = (req.session?.ccdCase?.data?.claimantName as string) || 'Treetops Housing';

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
