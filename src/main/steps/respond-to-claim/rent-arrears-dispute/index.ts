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
    const rentArrearsAmountConfirmationRaw = req.body?.rentArrears as 'yes' | 'no' | 'notSure' | undefined;
    const rentArrearsAmountRaw = req.body?.['rentArrears.rentArrearsAmountCorrection'] as string | undefined;

    const rentArrearsAmountConfirmation =
      rentArrearsAmountConfirmationRaw === 'yes'
        ? 'YES'
        : rentArrearsAmountConfirmationRaw === 'no'
          ? 'NO'
          : rentArrearsAmountConfirmationRaw === 'notSure'
            ? 'NOT_SURE'
            : undefined;

    let rentArrearsAmount: string | undefined;
    if (rentArrearsAmountConfirmationRaw === 'no' && rentArrearsAmountRaw) {
      const amountInPounds = parseFloat(rentArrearsAmountRaw.replace(/,/g, ''));
      if (!Number.isNaN(amountInPounds)) {
        rentArrearsAmount = String(Math.round(amountInPounds * 100));
      }
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        rentArrearsAmountConfirmation,
        ...(rentArrearsAmount !== undefined && { rentArrearsAmount }),
      },
    };

    await buildAndSubmitPossessionClaimResponse(req, possessionClaimResponse);
  },
  extendGetContent: (req: Request) => {
    const claimantName = getClaimantName(req);

    const caseData = req.res?.locals.validatedCase?.data;
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
