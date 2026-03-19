import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

export const step: StepDefinition = createFormStep({
  stepName: 'how-much-afford-to-pay',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
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
        hint: 'frequencyHint',
      },
      errorMessage: 'errors.installmentFrequency',
      legendClasses: 'govuk-fieldset__legend--m',
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
      const component = amountField.component as Record<string, unknown>;
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
