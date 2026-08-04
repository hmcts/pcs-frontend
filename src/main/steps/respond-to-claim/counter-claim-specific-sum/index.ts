import type { Request } from 'express';

import { validateAmount } from '../../../constants/validation';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { penceToPounds, poundsToPence } from '../../utils/currencyConversion';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'counter-claim-specific-sum',
  isAnswered: req => Boolean(req.res?.locals.validatedCase?.defendantResponses?.counterClaim?.isClaimAmountKnown),
  stepDir: __dirname,
  customTemplate: `${__dirname}/counterClaimSpecificSum.njk`,
  translationKeys: {
    pageTitle: 'pageTitle',
  },
  fields: [
    {
      name: 'isClaimAmountKnown',
      type: 'radio',
      required: true,
      isPageHeading: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: {
        label: 'heading',
      },
      errorMessage: 'errors.isClaimAmountKnown.required',
      options: [
        {
          value: 'yes',
          translationKey: 'options.yes',
          conditionalText: 'specificFeeText',
          subFields: {
            claimAmount: {
              name: 'claimAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.claimAmount.required',
              translationKey: {
                label: 'claimAmountLabel',
              },
              prefix: { text: '£' },
              classes: 'govuk-input--width-10',
              attributes: { inputmode: 'decimal', spellcheck: false },
              validator: (value: unknown): boolean | string =>
                validateAmount(value, {
                  invalidAmountFormatError: 'errors.claimAmount.invalidFormat',
                  minAmountError: 'errors.claimAmount.negative',
                  maxAmountError: 'errors.claimAmount.largeAmount',
                }),
            },
          },
        },
        {
          value: 'no',
          translationKey: 'options.no',
          conditionalText: 'noSpecificFeeText',
          subFields: {
            estimatedMaxClaimAmount: {
              name: 'estimatedMaxClaimAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.estimatedMaxClaimAmount.required',
              translationKey: {
                label: 'maxClaimAmountLabel',
              },
              prefix: { text: '£' },
              classes: 'govuk-input--width-10',
              attributes: { inputmode: 'decimal', spellcheck: false },
              validator: (value: unknown): boolean | string =>
                validateAmount(value, {
                  invalidAmountFormatError: 'errors.estimatedMaxClaimAmount.invalidFormat',
                  minAmountError: 'errors.estimatedMaxClaimAmount.negative',
                  maxAmountError: 'errors.estimatedMaxClaimAmount.largeAmount',
                }),
            },
          },
        },
      ],
    },
  ],
  getInitialFormData: (req: Request) => {
    const counterClaim = req.res?.locals.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim;

    if (!counterClaim?.isClaimAmountKnown) {
      return {};
    }

    const formData: Record<string, unknown> = {};

    if (counterClaim.isClaimAmountKnown === 'YES') {
      formData.isClaimAmountKnown = 'yes';
      if (counterClaim.claimAmount) {
        formData['isClaimAmountKnown.claimAmount'] = penceToPounds(counterClaim.claimAmount);
      }
    } else if (counterClaim.isClaimAmountKnown === 'NO') {
      formData.isClaimAmountKnown = 'no';
      if (counterClaim.estimatedMaxClaimAmount) {
        formData['isClaimAmountKnown.estimatedMaxClaimAmount'] = penceToPounds(counterClaim.estimatedMaxClaimAmount);
      }
    }

    return formData;
  },
  beforeRedirect: async (req: Request) => {
    const isClaimAmountKnown = req.body?.isClaimAmountKnown as string | undefined;
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.counterClaim = response.defendantResponses.counterClaim ?? {};

    if (isClaimAmountKnown === 'yes') {
      response.defendantResponses.counterClaim.isClaimAmountKnown = 'YES';
      const amountRaw = req.body?.['isClaimAmountKnown.claimAmount'] as string | undefined;
      const amountInPence = amountRaw ? poundsToPence(amountRaw) : undefined;
      if (amountInPence !== undefined) {
        response.defendantResponses.counterClaim.claimAmount = amountInPence;
      } else {
        delete response.defendantResponses.counterClaim.claimAmount;
      }
      delete response.defendantResponses.counterClaim.estimatedMaxClaimAmount;
    } else if (isClaimAmountKnown === 'no') {
      response.defendantResponses.counterClaim.isClaimAmountKnown = 'NO';
      const amountRaw = req.body?.['isClaimAmountKnown.estimatedMaxClaimAmount'] as string | undefined;
      const amountInPence = amountRaw ? poundsToPence(amountRaw) : undefined;
      if (amountInPence !== undefined) {
        response.defendantResponses.counterClaim.estimatedMaxClaimAmount = amountInPence;
      } else {
        delete response.defendantResponses.counterClaim.estimatedMaxClaimAmount;
      }
      delete response.defendantResponses.counterClaim.claimAmount;
    } else {
      delete response.defendantResponses.counterClaim.isClaimAmountKnown;
      delete response.defendantResponses.counterClaim.claimAmount;
      delete response.defendantResponses.counterClaim.estimatedMaxClaimAmount;
    }

    await saveDraftDefendantResponse(req, response);
  },
});
