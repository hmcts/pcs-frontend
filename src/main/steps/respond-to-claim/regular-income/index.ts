import type { Request } from 'express';

import { AMOUNT_FORMAT_REGEX, MAX_INCOME_AMOUNT } from '../../../constants/validation';
import { fromYesNoEnum, penceToPounds, poundsToPence, toYesNoEnum } from '../../utils';
import { buildDraftDefendantResponse, saveDraftDefendantResponse } from '../../utils/buildDraftDefendantResponse';
import { createRespondToClaimFormStep } from '../formStep';

import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const createAmountValidator =
  (negativeErrorKey: string, largeAmountErrorKey: string) =>
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
        return negativeErrorKey;
      }
      if (numericValue >= MAX_INCOME_AMOUNT) {
        return largeAmountErrorKey;
      }
    }

    if (!AMOUNT_FORMAT_REGEX.test(normalized)) {
      return 'errors.amount.invalidFormat';
    }

    return true;
  };

const validateMoneyFromElsewhereDetails = noEmojiValidator('errors.moneyFromElsewhereDetails.invalidCharacters');

const validateIncomeFromJobsAmount = createAmountValidator(
  'errors.incomeFromJobsAmount.negative',
  'errors.incomeFromJobsAmount.largeAmount'
);
const validatePensionAmount = createAmountValidator(
  'errors.pensionAmount.negative',
  'errors.pensionAmount.largeAmount'
);
const validateUniversalCreditAmount = createAmountValidator(
  'errors.universalCreditAmount.negative',
  'errors.universalCreditAmount.largeAmount'
);
const validateOtherBenefitsAmount = createAmountValidator(
  'errors.otherBenefitsAmount.negative',
  'errors.otherBenefitsAmount.largeAmount'
);

export const step: StepDefinition = createRespondToClaimFormStep({
  stepName: 'what-regular-income-do-you-receive',
  stepDir: __dirname,
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
    const response = buildDraftDefendantResponse(req);
    response.defendantResponses.householdCircumstances = response.defendantResponses.householdCircumstances ?? {};
    const hc = response.defendantResponses.householdCircumstances;

    const selectedIncome = req.body?.regularIncome as string | string[] | undefined;
    const incomeArray = Array.isArray(selectedIncome) ? selectedIncome : selectedIncome ? [selectedIncome] : [];

    const applyAmountFrequency = (
      checked: boolean,
      flagKey: 'incomeFromJobs' | 'pension' | 'universalCredit' | 'otherBenefits',
      amountKey: 'incomeFromJobsAmount' | 'pensionAmount' | 'universalCreditAmount' | 'otherBenefitsAmount',
      frequencyKey:
        | 'incomeFromJobsFrequency'
        | 'pensionFrequency'
        | 'universalCreditFrequency'
        | 'otherBenefitsFrequency',
      amountBodyKey: string,
      frequencyBodyKey: string
    ) => {
      if (checked) {
        hc[flagKey] = toYesNoEnum('yes');
        const amountRaw = (req.body?.[amountBodyKey] as string | undefined)?.trim();
        const frequency = (req.body?.[frequencyBodyKey] as string | undefined)?.trim();
        if (amountRaw) {
          hc[amountKey] = poundsToPence(amountRaw);
        } else {
          delete hc[amountKey];
        }
        if (frequency) {
          hc[frequencyKey] = frequency as (typeof hc)[typeof frequencyKey];
        } else {
          delete hc[frequencyKey];
        }
      } else {
        delete hc[flagKey];
        delete hc[amountKey];
        delete hc[frequencyKey];
      }
    };

    applyAmountFrequency(
      incomeArray.includes('incomeFromJobs'),
      'incomeFromJobs',
      'incomeFromJobsAmount',
      'incomeFromJobsFrequency',
      'regularIncome.incomeFromJobsAmount',
      'regularIncome.incomeFromJobsFrequency'
    );
    applyAmountFrequency(
      incomeArray.includes('pension'),
      'pension',
      'pensionAmount',
      'pensionFrequency',
      'regularIncome.pensionAmount',
      'regularIncome.pensionFrequency'
    );
    applyAmountFrequency(
      incomeArray.includes('universalCredit'),
      'universalCredit',
      'universalCreditAmount',
      'universalCreditFrequency',
      'regularIncome.universalCreditAmount',
      'regularIncome.universalCreditFrequency'
    );
    applyAmountFrequency(
      incomeArray.includes('otherBenefits'),
      'otherBenefits',
      'otherBenefitsAmount',
      'otherBenefitsFrequency',
      'regularIncome.otherBenefitsAmount',
      'regularIncome.otherBenefitsFrequency'
    );

    if (incomeArray.includes('moneyFromElsewhere')) {
      hc.moneyFromElsewhere = toYesNoEnum('yes');
      const details = (req.body?.['regularIncome.moneyFromElsewhereDetails'] as string | undefined)?.trim();
      if (details) {
        hc.moneyFromElsewhereDetails = details;
      } else {
        delete hc.moneyFromElsewhereDetails;
      }
    } else {
      delete hc.moneyFromElsewhere;
      delete hc.moneyFromElsewhereDetails;
    }

    await saveDraftDefendantResponse(
      req,

      response
    );
  },

  translationKeys: {
    caption: 'caption',
    heading: 'heading',
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
        label: 'groupName',
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
              validator: validateMoneyFromElsewhereDetails,
            },
          },
        },
      ],
    },
  ],
});
