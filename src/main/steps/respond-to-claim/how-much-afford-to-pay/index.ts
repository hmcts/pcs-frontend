import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { penceToPounds, poundsToPence } from '../../utils/currencyConversion';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'how-much-afford-to-pay',
  stepDir: __dirname,
  beforeRedirect: async req => {
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.paymentAgreement = response.defendantResponses.paymentAgreement ?? {};
    const installmentAmount = req.body?.installmentAmount as string | undefined;
    const installmentFrequency = req.body?.installmentFrequency as string | undefined;

    if (typeof installmentAmount === 'string' && installmentAmount.trim()) {
      const amountInPence = poundsToPence(installmentAmount);
      if (amountInPence !== undefined) {
        // pcs-api MoneyGBP JSON is a pence string (see MoneyGBPDeserializer), not { amount: ... }.
        response.defendantResponses.paymentAgreement.additionalRentContribution = amountInPence;
      }
    } else {
      delete response.defendantResponses.paymentAgreement.additionalRentContribution;
    }

    if (typeof installmentFrequency === 'string' && installmentFrequency.trim()) {
      response.defendantResponses.paymentAgreement.additionalContributionFrequency = installmentFrequency.trim();
    } else {
      delete response.defendantResponses.paymentAgreement.additionalContributionFrequency;
    }

    await saveDraftDefendantResponse(req, response);
  },
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
  },
  getInitialFormData: req => {
    const paymentAgreement =
      req.res?.locals?.validatedCase?.data?.possessionClaimResponse?.defendantResponses?.paymentAgreement;
    const amountInPounds = penceToPounds(paymentAgreement?.additionalRentContribution as string | number | undefined);
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
