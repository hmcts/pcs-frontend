import type { Request } from 'express';

import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { penceToPounds, poundsToPence, toYesNoEnum } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

// Validation constants (copied from rent-arrears-dispute)
const MAX_INCOME_AMOUNT = 1_000_000_000; // £1 billion maximum
const AMOUNT_FORMAT_REGEX = /^\d{1,10}\.\d{2}$/; // Up to 10 digits, exactly 2 decimal places

const createAmountValidator =
  (largeAmountErrorKey: string) =>
  (value: unknown): boolean | string => {
    if (typeof value !== 'string') {
      return true;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return true;
    } // Let required validation handle empty values

    const normalized = trimmed.replace(/,/g, '');
    const numericValue = parseFloat(normalized);

    if (!Number.isNaN(numericValue)) {
      if (numericValue < 0) {
        return 'errors.amount.negative';
      }
      // AC: £1bn or more should error
      if (numericValue >= MAX_INCOME_AMOUNT) {
        return largeAmountErrorKey;
      }
    }

    if (!AMOUNT_FORMAT_REGEX.test(normalized)) {
      return 'errors.amount.invalidFormat';
    }

    return true;
  };

const validateIncomeFromJobsAmount = createAmountValidator('errors.incomeFromJobsAmount.largeAmount');
const validatePensionAmount = createAmountValidator('errors.pensionAmount.largeAmount');
const validateUniversalCreditAmount = createAmountValidator('errors.universalCreditAmount.largeAmount');
const validateOtherBenefitsAmount = createAmountValidator('errors.otherBenefitsAmount.largeAmount');

export const step: StepDefinition = createFormStep({
  stepName: 'regular-income',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  showCancelButton: false,

  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const hc = caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances;

    if (!hc) {
      return {};
    }

    const formData: Record<string, unknown> = {};
    const selectedIncome: string[] = [];

    // Income from jobs - Case-insensitive check to handle backend variations (YES/Yes/yes)
    if (hc.incomeFromJobs && (hc.incomeFromJobs as string).toUpperCase() === 'YES') {
      selectedIncome.push('incomeFromJobs');
      if (hc.incomeFromJobsAmount) {
        formData['regularIncome.incomeFromJobsAmount'] = penceToPounds(hc.incomeFromJobsAmount as string);
      }
      if (hc.incomeFromJobsFrequency) {
        formData['regularIncome.incomeFromJobsFrequency'] = (hc.incomeFromJobsFrequency as string).toLowerCase();
      }
    }

    // Pension - Case-insensitive check to handle backend variations (YES/Yes/yes)
    if (hc.pension && (hc.pension as string).toUpperCase() === 'YES') {
      selectedIncome.push('pension');
      if (hc.pensionAmount) {
        formData['regularIncome.pensionAmount'] = penceToPounds(hc.pensionAmount as string);
      }
      if (hc.pensionFrequency) {
        formData['regularIncome.pensionFrequency'] = (hc.pensionFrequency as string).toLowerCase();
      }
    }

    // Universal Credit - Case-insensitive check to handle backend variations (YES/Yes/yes)
    // Note: amount/frequency may not exist - see BA clarification
    if (hc.universalCredit && (hc.universalCredit as string).toUpperCase() === 'YES') {
      selectedIncome.push('universalCredit');
      // UC amount/frequency commented out pending BA clarification
      // if (hc.universalCreditAmount) {
      //   const amountInPence = parseFloat(hc.universalCreditAmount as string);
      //   const amountInPounds = amountInPence / 100;
      //   formData['regularIncome.universalCreditAmount'] = amountInPounds.toFixed(2);
      // }
      // if (hc.universalCreditFrequency) {
      //   formData['regularIncome.universalCreditFrequency'] = (hc.universalCreditFrequency as string).toLowerCase();
      // }
    }

    // Other benefits - Case-insensitive check to handle backend variations (YES/Yes/yes)
    if (hc.otherBenefits && (hc.otherBenefits as string).toUpperCase() === 'YES') {
      selectedIncome.push('otherBenefits');
      if (hc.otherBenefitsAmount) {
        formData['regularIncome.otherBenefitsAmount'] = penceToPounds(hc.otherBenefitsAmount as string);
      }
      if (hc.otherBenefitsFrequency) {
        formData['regularIncome.otherBenefitsFrequency'] = (hc.otherBenefitsFrequency as string).toLowerCase();
      }
    }

    // Money from elsewhere - Case-insensitive check to handle backend variations (YES/Yes/yes)
    if (hc.moneyFromElsewhere && (hc.moneyFromElsewhere as string).toUpperCase() === 'YES') {
      selectedIncome.push('moneyFromElsewhere');
      if (hc.moneyFromElsewhereDetails) {
        formData['regularIncome.moneyFromElsewhereDetails'] = hc.moneyFromElsewhereDetails;
      }
    }

    if (selectedIncome.length > 0) {
      formData.regularIncome = selectedIncome;
    }

    return formData;
  },

  beforeRedirect: async (req: Request) => {
    const selectedIncome = req.body?.regularIncome as string | string[] | undefined;

    const incomeArray = Array.isArray(selectedIncome) ? selectedIncome : selectedIncome ? [selectedIncome] : [];
    const householdCircumstances: Record<string, unknown> = {};

    // Income from jobs
    householdCircumstances.incomeFromJobs = toYesNoEnum(incomeArray.includes('incomeFromJobs') ? 'yes' : 'no');
    if (incomeArray.includes('incomeFromJobs')) {
      const amountRaw = req.body?.['regularIncome.incomeFromJobsAmount'] as string | undefined;
      const frequency = req.body?.['regularIncome.incomeFromJobsFrequency'] as string | undefined;

      if (amountRaw) {
        householdCircumstances.incomeFromJobsAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.incomeFromJobsFrequency = frequency.toUpperCase();
      }
    }

    // Pension
    householdCircumstances.pension = toYesNoEnum(incomeArray.includes('pension') ? 'yes' : 'no');
    if (incomeArray.includes('pension')) {
      const amountRaw = req.body?.['regularIncome.pensionAmount'] as string | undefined;
      const frequency = req.body?.['regularIncome.pensionFrequency'] as string | undefined;

      if (amountRaw) {
        householdCircumstances.pensionAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.pensionFrequency = frequency.toUpperCase();
      }
    }

    // Universal Credit (checkbox only - amount/frequency pending BA clarification)
    householdCircumstances.universalCredit = toYesNoEnum(incomeArray.includes('universalCredit') ? 'yes' : 'no');
    // UC amount/frequency commented out pending BA clarification
    // if (incomeArray.includes('universalCredit')) {
    //   const amountRaw = req.body?.['regularIncome.universalCreditAmount'] as string | undefined;
    //   const frequency = req.body?.['regularIncome.universalCreditFrequency'] as string | undefined;
    //   if (amountRaw) {
    //     const normalized = amountRaw.replace(/,/g, '');
    //     const amountInPounds = parseFloat(normalized);
    //     if (!Number.isNaN(amountInPounds)) {
    //       householdCircumstances.universalCreditAmount = String(Math.round(amountInPounds * 100));
    //     }
    //   }
    //   if (frequency) {
    //     householdCircumstances.universalCreditFrequency = frequency.toUpperCase();
    //   }
    // }

    // Other benefits
    householdCircumstances.otherBenefits = toYesNoEnum(incomeArray.includes('otherBenefits') ? 'yes' : 'no');
    if (incomeArray.includes('otherBenefits')) {
      const amountRaw = req.body?.['regularIncome.otherBenefitsAmount'] as string | undefined;
      const frequency = req.body?.['regularIncome.otherBenefitsFrequency'] as string | undefined;

      if (amountRaw) {
        householdCircumstances.otherBenefitsAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.otherBenefitsFrequency = frequency.toUpperCase();
      }
    }

    // Money from elsewhere
    householdCircumstances.moneyFromElsewhere = toYesNoEnum(incomeArray.includes('moneyFromElsewhere') ? 'yes' : 'no');
    if (incomeArray.includes('moneyFromElsewhere')) {
      const details = req.body?.['regularIncome.moneyFromElsewhereDetails'] as string | undefined;
      if (details) {
        householdCircumstances.moneyFromElsewhereDetails = details;
      }
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances,
      },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },

  translationKeys: {
    caption: 'caption',
    heading: 'pageTitle',
    pageTitle: 'pageTitle',
    hintText: 'hintText',
  },

  fields: [
    {
      name: 'regularIncome',
      type: 'checkbox',
      required: false, // Page is optional - can select zero checkboxes
      legendClasses: 'govuk-visually-hidden',
      translationKey: {
        label: 'pageTitle',
        hint: 'hintText',
      },
      options: [
        // Option 1: Income from all jobs you do
        {
          value: 'incomeFromJobs',
          translationKey: 'options.incomeFromJobs',
          subFields: {
            incomeFromJobsAmount: {
              name: 'incomeFromJobsAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.incomeFromJobsAmount.required',
              translationKey: {
                label: 'subFields.amount',
              },
              prefix: {
                text: '£',
              },
              classes: 'govuk-input--width-10',
              attributes: {
                inputmode: 'decimal',
                spellcheck: false,
              },
              validator: validateIncomeFromJobsAmount,
            },
            incomeFromJobsFrequency: {
              name: 'incomeFromJobsFrequency',
              type: 'radio',
              required: true,
              errorMessage: 'errors.incomeFromJobsFrequency.required',
              translationKey: {
                label: 'subFields.frequency',
              },
              options: [
                { value: 'week', translationKey: 'frequency.week' },
                { value: 'month', translationKey: 'frequency.month' },
              ],
            },
          },
        },
        // Option 2: Pension - state and private
        {
          value: 'pension',
          translationKey: 'options.pension',
          subFields: {
            pensionAmount: {
              name: 'pensionAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.pensionAmount.required',
              translationKey: {
                label: 'subFields.amount',
              },
              prefix: {
                text: '£',
              },
              classes: 'govuk-input--width-10',
              attributes: {
                inputmode: 'decimal',
                spellcheck: false,
              },
              validator: validatePensionAmount,
            },
            pensionFrequency: {
              name: 'pensionFrequency',
              type: 'radio',
              required: true,
              errorMessage: 'errors.pensionFrequency.required',
              translationKey: {
                label: 'subFields.frequency',
              },
              options: [
                { value: 'week', translationKey: 'frequency.week' },
                { value: 'month', translationKey: 'frequency.month' },
              ],
            },
          },
        },
        // Option 3: Universal Credit
        {
          value: 'universalCredit',
          translationKey: 'options.universalCredit',
          subFields: {
            universalCreditAmount: {
              name: 'universalCreditAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.universalCreditAmount.required',
              translationKey: {
                label: 'subFields.amount',
              },
              prefix: {
                text: '£',
              },
              classes: 'govuk-input--width-10',
              attributes: {
                inputmode: 'decimal',
                spellcheck: false,
              },
              validator: validateUniversalCreditAmount,
            },
            universalCreditFrequency: {
              name: 'universalCreditFrequency',
              type: 'radio',
              required: true,
              errorMessage: 'errors.universalCreditFrequency.required',
              translationKey: {
                label: 'subFields.frequency',
              },
              options: [
                { value: 'week', translationKey: 'frequency.week' },
                { value: 'month', translationKey: 'frequency.month' },
              ],
            },
          },
        },
        // Option 4: Other benefits and credits
        {
          value: 'otherBenefits',
          translationKey: 'options.otherBenefits',
          subFields: {
            otherBenefitsAmount: {
              name: 'otherBenefitsAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.otherBenefitsAmount.required',
              translationKey: {
                label: 'subFields.amount',
              },
              prefix: {
                text: '£',
              },
              classes: 'govuk-input--width-10',
              attributes: {
                inputmode: 'decimal',
                spellcheck: false,
              },
              validator: validateOtherBenefitsAmount,
            },
            otherBenefitsFrequency: {
              name: 'otherBenefitsFrequency',
              type: 'radio',
              required: true,
              errorMessage: 'errors.otherBenefitsFrequency.required',
              translationKey: {
                label: 'subFields.frequency',
              },
              options: [
                { value: 'week', translationKey: 'frequency.week' },
                { value: 'month', translationKey: 'frequency.month' },
              ],
            },
          },
        },
        // Option 5: Money from somewhere else - TEXTAREA ONLY (no amount/frequency)
        {
          value: 'moneyFromElsewhere',
          translationKey: 'options.moneyFromElsewhere',
          subFields: {
            moneyFromElsewhereDetails: {
              name: 'moneyFromElsewhereDetails',
              type: 'character-count',
              maxLength: 500,
              required: true,
              errorMessage: 'errors.moneyFromElsewhereDetails.required',
              labelClasses: 'govuk-visually-hidden',
              translationKey: {
                label: 'subFields.moneyFromElsewhereDetailsLabel',
                hint: 'subFields.moneyFromElsewhereDetailsHint',
              },
            },
          },
        },
      ],
    },
  ],
});
