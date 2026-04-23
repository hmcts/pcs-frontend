import type { Request } from 'express';

import { penceToPounds, poundsToPence } from '../../utils/currencyConversion';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { CcdCounterClaim, PossessionClaimResponse } from '@services/ccdCase.interface';

const AMOUNT_FORMAT_REGEX = /^\d{1,10}\.\d{2}$/;
const MAX_AMOUNT = 1_000_000_000;

const createAmountValidator =
  (largeAmountKey: string, negativeKey: string, invalidFormatKey: string) =>
  (value: unknown): boolean | string => {
    if (typeof value !== 'string') {
      return true;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return true;
    }

    const normalized = trimmed.replace(/,/g, '');
    const numericValue = parseFloat(normalized);

    if (!Number.isNaN(numericValue)) {
      if (numericValue < 0) {
        return negativeKey;
      }
      if (numericValue >= MAX_AMOUNT) {
        return largeAmountKey;
      }
    }

    if (!AMOUNT_FORMAT_REGEX.test(normalized)) {
      return invalidFormatKey;
    }

    return true;
  };

const validateClaimAmount = createAmountValidator(
  'errors.claimAmount.largeAmount',
  'errors.claimAmount.negative',
  'errors.claimAmount.invalidFormat'
);
const validateEstimatedMaxClaimAmount = createAmountValidator(
  'errors.estimatedMaxClaimAmount.largeAmount',
  'errors.estimatedMaxClaimAmount.negative',
  'errors.estimatedMaxClaimAmount.invalidFormat'
);

export const step: StepDefinition = createFormStep({
  stepName: 'counterclaim-specific-sum',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/counterclaimSpecificSum.njk`,
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
              validator: validateClaimAmount,
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
              validator: validateEstimatedMaxClaimAmount,
            },
          },
        },
      ],
    },
  ],
  getInitialFormData: (req: Request) => {
    const counterClaim =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim;

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

    if (!isClaimAmountKnown) {
      return;
    }

    const counterClaim: CcdCounterClaim = { isClaimAmountKnown: isClaimAmountKnown.toUpperCase() };

    if (isClaimAmountKnown === 'yes') {
      const amountRaw = req.body?.['isClaimAmountKnown.claimAmount'] as string | undefined;
      if (amountRaw) {
        counterClaim.claimAmount = poundsToPence(amountRaw);
      }
    } else if (isClaimAmountKnown === 'no') {
      const amountRaw = req.body?.['isClaimAmountKnown.estimatedMaxClaimAmount'] as string | undefined;
      if (amountRaw) {
        counterClaim.estimatedMaxClaimAmount = poundsToPence(amountRaw);
      }
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: { counterClaim: { ...counterClaim } },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
