import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { additionalRentContributionToPoundsString, poundsStringToPence } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

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
