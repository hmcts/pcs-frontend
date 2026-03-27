import type { Request } from 'express';

import { AMOUNT_FORMAT_REGEX, MAX_INCOME_AMOUNT } from '../../../constants/validation';
import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { fromYesNoEnum, penceToPounds, poundsToPence, toYesNoEnum } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';

import { createFormStep } from '@modules/steps';

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

    // Income from jobs
    if (fromYesNoEnum(hc.incomeFromJobs) === 'yes') {
      selectedIncome.push('incomeFromJobs');
      if (hc.incomeFromJobsAmount) {
        formData['regularIncome.incomeFromJobsAmount'] = penceToPounds(hc.incomeFromJobsAmount as string);
      }
      if (hc.incomeFromJobsFrequency) {
        formData['regularIncome.incomeFromJobsFrequency'] = hc.incomeFromJobsFrequency;
      }
    }

    // Pension
    if (fromYesNoEnum(hc.pension) === 'yes') {
      selectedIncome.push('pension');
      if (hc.pensionAmount) {
        formData['regularIncome.pensionAmount'] = penceToPounds(hc.pensionAmount as string);
      }
      if (hc.pensionFrequency) {
        formData['regularIncome.pensionFrequency'] = hc.pensionFrequency;
      }
    }

    // Universal Credit
    if (fromYesNoEnum(hc.universalCredit) === 'yes') {
      selectedIncome.push('universalCredit');
      if (hc.universalCreditAmount) {
        formData['regularIncome.universalCreditAmount'] = penceToPounds(hc.universalCreditAmount as string);
      }
      if (hc.universalCreditFrequency) {
        formData['regularIncome.universalCreditFrequency'] = hc.universalCreditFrequency;
      }
    }

    // Other benefits
    if (fromYesNoEnum(hc.otherBenefits) === 'yes') {
      selectedIncome.push('otherBenefits');
      if (hc.otherBenefitsAmount) {
        formData['regularIncome.otherBenefitsAmount'] = penceToPounds(hc.otherBenefitsAmount as string);
      }
      if (hc.otherBenefitsFrequency) {
        formData['regularIncome.otherBenefitsFrequency'] = hc.otherBenefitsFrequency;
      }
    }

    // Money from elsewhere
    if (fromYesNoEnum(hc.moneyFromElsewhere) === 'yes') {
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
        householdCircumstances.incomeFromJobsFrequency = frequency;
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
        householdCircumstances.pensionFrequency = frequency;
      }
    }

    // Universal Credit
    householdCircumstances.universalCredit = toYesNoEnum(incomeArray.includes('universalCredit') ? 'yes' : 'no');
    if (incomeArray.includes('universalCredit')) {
      const amountRaw = req.body?.['regularIncome.universalCreditAmount'] as string | undefined;
      const frequency = req.body?.['regularIncome.universalCreditFrequency'] as string | undefined;

      if (amountRaw) {
        householdCircumstances.universalCreditAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.universalCreditFrequency = frequency;
      }
    }

    // Other benefits
    householdCircumstances.otherBenefits = toYesNoEnum(incomeArray.includes('otherBenefits') ? 'yes' : 'no');
    if (incomeArray.includes('otherBenefits')) {
      const amountRaw = req.body?.['regularIncome.otherBenefitsAmount'] as string | undefined;
      const frequency = req.body?.['regularIncome.otherBenefitsFrequency'] as string | undefined;

      if (amountRaw) {
        householdCircumstances.otherBenefitsAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.otherBenefitsFrequency = frequency;
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
                { value: 'WEEKLY', translationKey: 'frequency.week' },
                { value: 'MONTHLY', translationKey: 'frequency.month' },
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
                { value: 'WEEKLY', translationKey: 'frequency.week' },
                { value: 'MONTHLY', translationKey: 'frequency.month' },
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
                { value: 'WEEKLY', translationKey: 'frequency.week' },
                { value: 'MONTHLY', translationKey: 'frequency.month' },
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
                { value: 'WEEKLY', translationKey: 'frequency.week' },
                { value: 'MONTHLY', translationKey: 'frequency.month' },
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
