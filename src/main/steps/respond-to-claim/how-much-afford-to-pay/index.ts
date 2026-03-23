import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

type MoneyGbpValue = {
  amount?: number | string;
};

function poundsStringToPence(value: string): number | undefined {
  const parsed = Number(value.trim());
  if (Number.isFinite(parsed)) {
    return Math.round(parsed * 100);
  }

  return undefined;
}

/** Maps CCD MoneyGBP (pence string), legacy { amount: pence }, or numeric forms to pounds for the form. */
function additionalRentContributionToPoundsString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const pence = Number(value.trim());
    return Number.isFinite(pence) ? (pence / 100).toFixed(2) : undefined;
  }

  return penceToPoundsString(value);
}

function penceToPoundsString(value: unknown): string | undefined {
  const getPenceAmount = (amountValue: unknown): number | undefined => {
    if (typeof amountValue === 'number' && Number.isFinite(amountValue)) {
      return amountValue;
    }

    if (typeof amountValue === 'string' && amountValue.trim()) {
      const parsed = Number(amountValue.trim());
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  };

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(2);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed.toFixed(2) : undefined;
  }

  if (typeof value === 'object' && value !== null) {
    const penceAmount = getPenceAmount((value as MoneyGbpValue).amount);
    if (penceAmount === undefined) {
      return undefined;
    }

    return (penceAmount / 100).toFixed(2);
  }

  return undefined;
}

export const step: StepDefinition = createFormStep({
  stepName: 'how-much-afford-to-pay',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  beforeRedirect: async req => {
    const installmentAmount = req.body?.installmentAmount as string | undefined;
    const installmentFrequency = req.body?.installmentFrequency as string | undefined;

    const paymentAgreement: Record<string, unknown> = {};

    if (typeof installmentAmount === 'string' && installmentAmount.trim()) {
      const amountInPence = poundsStringToPence(installmentAmount);
      if (amountInPence !== undefined) {
        // pcs-api MoneyGBP JSON is a pence string (see MoneyGBPDeserializer), not { amount: ... }.
        paymentAgreement.additionalRentContribution = String(amountInPence);
      }
    }

    if (typeof installmentFrequency === 'string' && installmentFrequency.trim()) {
      paymentAgreement.additionalContributionFrequency = installmentFrequency.trim();
    }

    if (Object.keys(paymentAgreement).length === 0) {
      return;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        paymentAgreement,
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
  },
  getInitialFormData: req => {
    const caseData = req.res?.locals?.validatedCase?.data as
      | {
          possessionClaimResponse?: {
            defendantResponses?: {
              paymentAgreement?: {
                additionalRentContribution?: unknown;
                additionalContributionFrequency?: string;
              };
            };
            paymentAgreement?: {
              additionalRentContribution?: unknown;
              additionalContributionFrequency?: string;
            };
          };
        }
      | undefined;

    const pcr = caseData?.possessionClaimResponse;
    const paymentAgreement = pcr?.defendantResponses?.paymentAgreement ?? pcr?.paymentAgreement;
    const amountInPounds = additionalRentContributionToPoundsString(paymentAgreement?.additionalRentContribution);
    const installmentFrequency = paymentAgreement?.additionalContributionFrequency;

    if (amountInPounds || installmentFrequency) {
      return {
        ...(amountInPounds ? { installmentAmount: amountInPounds } : {}),
        ...(installmentFrequency ? { installmentFrequency } : {}),
      };
    }

    return {};
  },
  fields: [
    {
      name: 'installmentAmount',
      type: 'text',
      required: true,
      translationKey: {
        label: 'amountQuestion',
        hint: 'amountHint',
      },
      labelClasses: 'govuk-label--s govuk-!-font-weight-bold',
      errorMessage: 'errors.installmentAmount',
      validator: value => {
        const amountString = String(value).trim();
        if (!/^-?\d+(\.\d{1,2})?$/.test(amountString)) {
          return 'errors.installmentAmountFormat';
        }

        const amount = Number(amountString);
        if (Number.isNaN(amount)) {
          return 'errors.installmentAmountFormat';
        }
        if (amount < 0) {
          return 'errors.installmentAmountMin';
        }
        if (amount >= 1000000000) {
          return 'errors.installmentAmountMax';
        }

        return true;
      },
    },
    {
      name: 'installmentFrequency',
      type: 'radio',
      required: true,
      translationKey: {
        label: 'frequencyQuestion',
      },
      errorMessage: 'errors.installmentFrequency',
      legendClasses: 'govuk-fieldset__legend--m govuk-!-font-size-19',
      options: [
        { value: 'weekly', translationKey: 'frequencyOptions.weekly' },
        { value: 'every2Weeks', translationKey: 'frequencyOptions.every2Weeks' },
        { value: 'every4Weeks', translationKey: 'frequencyOptions.every4Weeks' },
        { value: 'monthly', translationKey: 'frequencyOptions.monthly' },
      ],
    },
  ],
  extendGetContent: (_req, formContent) => {
    const amountField = formContent.fields.find(
      field => field.componentType === 'input' && (field.component as { name?: string })?.name === 'installmentAmount'
    );

    if (amountField?.component) {
      const component = amountField.component;
      const existingAttributes = (component.attributes as Record<string, unknown> | undefined) || {};

      component.prefix = { text: '£' };
      component.classes = 'govuk-input--width-10';
      component.attributes = {
        inputmode: 'decimal',
        ...existingAttributes,
      };
    }

    return {};
  },
});
