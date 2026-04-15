import type { Request } from 'express';

import { AMOUNT_FORMAT_REGEX, MAX_INCOME_AMOUNT } from '../../../constants/validation';
import type {
  FrequencyValue,
  HouseholdCircumstances,
  IncomeExpenseDetails,
  PossessionClaimResponse,
} from '../../../interfaces/ccdCase.interface';
import type { StepDefinition } from '../../../interfaces/stepFormData.interface';
import { fromYesNoEnum, penceToPounds, poundsToPence, toYesNoEnum } from '../../utils';
import { buildCcdCaseForPossessionClaimResponse } from '../../utils/populateResponseToClaimPayloadmap';
import { flowConfig } from '../flow.config';
import { createFormStep } from '@modules/steps';

const createAmountValidator =
  (largeAmountErrorKey: string, negativeErrorKey: string) =>
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
        return negativeErrorKey;
      }
      // AC: £1bn or more should throw error
      if (numericValue >= MAX_INCOME_AMOUNT) {
        return largeAmountErrorKey;
      }
    }

    if (!AMOUNT_FORMAT_REGEX.test(normalized)) {
      return 'errors.amount.invalidFormat';
    }

    return true;
  };

const validateHouseholdBillsAmount = createAmountValidator(
  'errors.householdBillsAmount.largeAmount',
  'errors.householdBillsAmount.negative'
);
const validateLoanPaymentsAmount = createAmountValidator(
  'errors.loanPaymentsAmount.largeAmount',
  'errors.loanPaymentsAmount.negative'
);
const validateChildSpousalMaintenanceAmount = createAmountValidator(
  'errors.childSpousalMaintenanceAmount.largeAmount',
  'errors.childSpousalMaintenanceAmount.negative'
);
const validateMobilePhoneAmount = createAmountValidator(
  'errors.mobilePhoneAmount.largeAmount',
  'errors.mobilePhoneAmount.negative'
);
const validateGroceryShoppingAmount = createAmountValidator(
  'errors.groceryShoppingAmount.largeAmount',
  'errors.groceryShoppingAmount.negative'
);
const validateFuelParkingTransportAmount = createAmountValidator(
  'errors.fuelParkingTransportAmount.largeAmount',
  'errors.fuelParkingTransportAmount.negative'
);
const validateSchoolCostsAmount = createAmountValidator(
  'errors.schoolCostsAmount.largeAmount',
  'errors.schoolCostsAmount.negative'
);
const validateClothingAmount = createAmountValidator(
  'errors.clothingAmount.largeAmount',
  'errors.clothingAmount.negative'
);
const validateOtherExpensesAmount = createAmountValidator(
  'errors.otherExpensesAmount.largeAmount',
  'errors.otherExpensesAmount.negative'
);

const regularExpenseKeys = [
  'householdBills',
  'loanPayments',
  'childSpousalMaintenance',
  'mobilePhone',
  'groceryShopping',
  'fuelParkingTransport',
  'schoolCosts',
  'clothing',
  'otherExpenses',
] as const;

export const step: StepDefinition = createFormStep({
  stepName: 'what-other-regular-expenses-do-you-have',
  journeyFolder: 'respondToClaim',
  stepDir: __dirname,
  flowConfig,
  showCancelButton: false,
  translationKeys: {
    heading: 'heading',
    pageTitle: 'pageTitle',
    hintText: 'hintText',
  },

  fields: [
    {
      name: 'regularExpenses',
      type: 'checkbox',
      required: false,
      legendClasses: 'govuk-visually-hidden',
      translationKey: {
        label: 'pageTitle',
        hint: 'hintText',
      },
      options: [
        {
          value: 'householdBills',
          translationKey: 'options.householdBills',
          subFields: {
            householdBillsAmount: {
              name: 'householdBillsAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.householdBillsAmount.required',
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
              validator: validateHouseholdBillsAmount,
            },
            householdBillsFrequency: {
              name: 'householdBillsFrequency',
              type: 'radio',
              required: true,
              errorMessage: 'errors.householdBillsFrequency.required',
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
        {
          value: 'loanPayments',
          translationKey: 'options.loanPayments',
          subFields: {
            loanPaymentsAmount: {
              name: 'loanPaymentsAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.loanPaymentsAmount.required',
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
              validator: validateLoanPaymentsAmount,
            },
            loanPaymentsFrequency: {
              name: 'loanPaymentsFrequency',
              type: 'radio',
              required: true,
              errorMessage: 'errors.loanPaymentsFrequency.required',
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
        {
          value: 'childSpousalMaintenance',
          translationKey: 'options.childSpousalMaintenance',
          subFields: {
            childSpousalMaintenanceAmount: {
              name: 'childSpousalMaintenanceAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.childSpousalMaintenanceAmount.required',
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
              validator: validateChildSpousalMaintenanceAmount,
            },
            childSpousalMaintenanceFrequency: {
              name: 'childSpousalMaintenanceFrequency',
              type: 'radio',
              required: true,
              errorMessage: 'errors.childSpousalMaintenanceFrequency.required',
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
        {
          value: 'mobilePhone',
          translationKey: 'options.mobilePhone',
          subFields: {
            mobilePhoneAmount: {
              name: 'mobilePhoneAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.mobilePhoneAmount.required',
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
              validator: validateMobilePhoneAmount,
            },
            mobilePhoneFrequency: {
              name: 'mobilePhoneFrequency',
              type: 'radio',
              required: true,
              errorMessage: 'errors.mobilePhoneFrequency.required',
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
        {
          value: 'groceryShopping',
          translationKey: 'options.groceryShopping',
          subFields: {
            groceryShoppingAmount: {
              name: 'groceryShoppingAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.groceryShoppingAmount.required',
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
              validator: validateGroceryShoppingAmount,
            },
            groceryShoppingFrequency: {
              name: 'groceryShoppingFrequency',
              type: 'radio',
              required: true,
              errorMessage: 'errors.groceryShoppingFrequency.required',
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
        {
          value: 'fuelParkingTransport',
          translationKey: 'options.fuelParkingTransport',
          subFields: {
            fuelParkingTransportAmount: {
              name: 'fuelParkingTransportAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.fuelParkingTransportAmount.required',
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
              validator: validateFuelParkingTransportAmount,
            },
            fuelParkingTransportFrequency: {
              name: 'fuelParkingTransportFrequency',
              type: 'radio',
              required: true,
              errorMessage: 'errors.fuelParkingTransportFrequency.required',
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
        {
          value: 'schoolCosts',
          translationKey: 'options.schoolCosts',
          subFields: {
            schoolCostsAmount: {
              name: 'schoolCostsAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.schoolCostsAmount.required',
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
              validator: validateSchoolCostsAmount,
            },
            schoolCostsFrequency: {
              name: 'schoolCostsFrequency',
              type: 'radio',
              required: true,
              errorMessage: 'errors.schoolCostsFrequency.required',
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
        {
          value: 'clothing',
          translationKey: 'options.clothing',
          subFields: {
            clothingAmount: {
              name: 'clothingAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.clothingAmount.required',
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
              validator: validateClothingAmount,
            },
            clothingFrequency: {
              name: 'clothingFrequency',
              type: 'radio',
              required: true,
              errorMessage: 'errors.clothingFrequency.required',
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
        {
          value: 'otherExpenses',
          translationKey: 'options.otherExpenses',
          subFields: {
            otherExpensesAmount: {
              name: 'otherExpensesAmount',
              type: 'text',
              required: true,
              errorMessage: 'errors.otherExpensesAmount.required',
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
              validator: validateOtherExpensesAmount,
            },
            otherExpensesFrequency: {
              name: 'otherExpensesFrequency',
              type: 'radio',
              required: true,
              errorMessage: 'errors.otherExpensesFrequency.required',
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
      ],
    },
  ],
  getInitialFormData: (req: Request) => {
    const caseData = req.res?.locals?.validatedCase?.data;
    const draftHc = caseData?.possessionClaimResponse?.defendantResponses?.householdCircumstances as
      | HouseholdCircumstances
      | undefined;

    if (!draftHc) {
      return {};
    }

    const formData: Record<string, unknown> = {};
    const selected: string[] = [];

    for (const key of regularExpenseKeys) {
      const expenseDetails = draftHc[key];
      if (fromYesNoEnum(expenseDetails?.applies) === 'yes') {
        selected.push(key);
      }
      if (expenseDetails?.amount) {
        formData[`regularExpenses.${key}Amount`] = penceToPounds(expenseDetails.amount);
      }
      if (expenseDetails?.frequency) {
        formData[`regularExpenses.${key}Frequency`] = expenseDetails.frequency;
      }
    }

    if (selected.length > 0) {
      formData.regularExpenses = selected;
    }

    return formData;
  },

  beforeRedirect: async (req: Request) => {
    const selectedRaw = req.body?.regularExpenses as string | string[] | undefined;
    const selected = Array.isArray(selectedRaw) ? selectedRaw : selectedRaw ? [selectedRaw] : [];
    const householdCircumstances: Record<string, unknown> = {};
    const body = req.body as Record<string, unknown> | undefined;

    for (const key of regularExpenseKeys) {
      const isYes = selected.includes(key);
      const amountRaw = body?.[`regularExpenses.${key}Amount`] as string | undefined;
      const frequency = body?.[`regularExpenses.${key}Frequency`] as string | undefined;

      const details: IncomeExpenseDetails = {
        applies: toYesNoEnum(isYes ? 'yes' : 'no'),
      };
      if (isYes) {
        if (amountRaw) {
          details.amount = poundsToPence(amountRaw);
        }
        if (frequency) {
          details.frequency = frequency as FrequencyValue;
        }
      }
      householdCircumstances[key] = details;
    }

    const possessionClaimResponse: PossessionClaimResponse = {
      defendantResponses: {
        householdCircumstances,
      },
    };
    await buildCcdCaseForPossessionClaimResponse(req, possessionClaimResponse);
  },
});
