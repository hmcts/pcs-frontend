import type { Request } from 'express';

import { additionalRentContributionToPoundsString, poundsStringToPence } from '../../utils';
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
const validateMaxClaimAmount = createAmountValidator(
  'errors.maxClaimAmount.largeAmount',
  'errors.maxClaimAmount.negative',
  'errors.maxClaimAmount.invalidFormat'
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
      name: 'specificSum',
      type: 'radio',
      required: true,
      isPageHeading: true,
      legendClasses: 'govuk-fieldset__legend--l',
      translationKey: {
        label: 'heading',
      },
      errorMessage: 'errors.specificSum.required',
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
                hint: 'claimAmountHint',
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
            maxClaimAmount: {
              name: 'maxClaimAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.maxClaimAmount.required',
              translationKey: {
                label: 'maxClaimAmountLabel',
                hint: 'maxClaimAmountHint',
              },
              prefix: { text: '£' },
              classes: 'govuk-input--width-10',
              attributes: { inputmode: 'decimal', spellcheck: false },
              validator: validateMaxClaimAmount,
            },
          },
        },
      ],
    },
  ],
  getInitialFormData: (req: Request) => {
    const counterClaim =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.counterClaim;

    if (!counterClaim?.specificSum) {
      return {};
    }

    const formData: Record<string, unknown> = {};

    if (counterClaim.specificSum === 'YES') {
      formData.specificSum = 'yes';
      if (counterClaim.claimAmount) {
        formData['specificSum.claimAmount'] = additionalRentContributionToPoundsString(counterClaim.claimAmount);
      }
    } else if (counterClaim.specificSum === 'NO') {
      formData.specificSum = 'no';
      if (counterClaim.maxClaimAmount) {
        formData['specificSum.maxClaimAmount'] = additionalRentContributionToPoundsString(counterClaim.maxClaimAmount);
      }
    }

    return formData;
  },
  beforeRedirect: async (req: Request) => {
    const specificSum = req.body?.specificSum as string | undefined;

    if (!specificSum) {
      return;
    }

    const counterClaim: CcdCounterClaim = { specificSum: specificSum.toUpperCase() };

    if (specificSum === 'yes') {
      const amountRaw = req.body?.['specificSum.claimAmount'] as string | undefined;
      if (amountRaw) {
        counterClaim.claimAmount = String(poundsStringToPence(amountRaw));
      }
    } else if (specificSum === 'no') {
      const amountRaw = req.body?.['specificSum.maxClaimAmount'] as string | undefined;
      if (amountRaw) {
        counterClaim.maxClaimAmount = String(poundsStringToPence(amountRaw));
      }
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: { counterClaim: { ...counterClaim } },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
