import { additionalRentContributionToPoundsString, normalizeYesNoValue, poundsStringToPence } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep, getTranslationFunction } from '@modules/steps';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import type { PossessionClaimResponse, YesNoValue } from '@services/ccdCase.interface';
import { caseNumberFormatter } from 'steps/utils/caseNumberFormatter';

function repayArrearsInstalmentsFromConfirmOffer(value: string | undefined): YesNoValue | undefined {
  if (value === 'yes') {
    return 'YES';
  }
  if (value === 'no') {
    return 'NO';
  }
  return undefined;
}

export const step: StepDefinition = createFormStep({
  stepName: 'installment-payments',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  customTemplate: `${__dirname}/instalmentOffer.njk`,
  beforeRedirect: async req => {
    const repayArrearsInstalments = repayArrearsInstalmentsFromConfirmOffer(
      req.body?.confirmInstallmentOffer as string | undefined
    );
    if (repayArrearsInstalments === undefined) {
      return;
    }

    // Legal Rep journey
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
        paymentAgreement: { repayArrearsInstalments },
      },
    };

    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
  getInitialFormData: req => {
    const caseData = req.res?.locals?.validatedCase?.data as
      | {
          possessionClaimResponse?: {
            defendantResponses?: { 
              paymentAgreement?: { 
                repayArrearsInstalments?: YesNoValue 
                additionalRentContribution?: unknown;
                additionalContributionFrequency?: string;
              } 
            };
            paymentAgreement?: {
              additionalRentContribution?: unknown;
              additionalContributionFrequency?: string;
            };
          };
        }
      | undefined;

    const stored = caseData?.possessionClaimResponse?.defendantResponses?.paymentAgreement?.repayArrearsInstalments;
    const normalizedStored = normalizeYesNoValue(stored);

    if (normalizedStored === 'YES') {
      return { confirmInstallmentOffer: 'yes' };
    }
    if (normalizedStored === 'NO') {
      return { confirmInstallmentOffer: 'no' };
    }

    // legal rep 

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
  translationKeys: {
    pageTitle: 'pageTitle',
    caption: 'caption',
    heading: 'heading',
    caseNumber: 'caseNumber',
    paragraph1: 'paragraph1',
    paragraph2: 'paragraph2',
    paragraph3: 'paragraph3',
    paragraph4: 'paragraph4',
    question: 'question',
  },
  fields: [
    {
      name: 'confirmInstallmentOffer',
      type: 'radio',
      required: true,
      legendClasses: 'govuk-fieldset__legend--m',
      translationKey: { label: 'question' },
      options: [
        { 
          value: 'yes', 
          translationKey: 'options.yes',
          subFields: 
            { 
              installmentAmount: {
                name: 'installmentAmount',
                type: 'text',
                required: true,
                translationKey: {
                  label: 'amountQuestion',
                  hint: 'amountHint',
                },
                labelClasses:'govuk-label--s govuk-!-font-weight-bold',
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
              installmentFrequency: {
                name: 'installmentFrequency',
                type: 'radio',
                required: true,
                translationKey: {
                  label: 'frequencyQuestion',
                },
                errorMessage: 'errors.installmentFrequency',
                labelClasses:'govuk-label--s govuk-!-font-weight-bold',
                options: [
                  { value: 'weekly', translationKey: 'frequencyOptions.weekly' },
                  { value: 'every2Weeks', translationKey: 'frequencyOptions.every2Weeks' },
                  { value: 'every4Weeks', translationKey: 'frequencyOptions.every4Weeks' },
                  { value: 'monthly', translationKey: 'frequencyOptions.monthly' },
                ],
              }
            },
        },
        { value: 'no', translationKey: 'options.no' },
      ],
    },
  ],
  extendGetContent: (req, formContent) => {
    // legal rep

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

    const caseData = req.res?.locals?.validatedCase?.data as { claimantName?: string } | undefined;
    const claimantName = caseData?.claimantName || 'Treetops Housing';
    const caseNumber = caseNumberFormatter(req.res?.locals?.validatedCase?.id as string);

    const t = getTranslationFunction(req, 'installment-payments', ['common']);

    return {
      claimantName,
      paragraph1: t('paragraph1', { claimantName }),
      caseNumber: t('caseNumber', { caseNumber }),
    };
  },
});
