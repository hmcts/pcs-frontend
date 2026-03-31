import type { Request } from 'express';

import { AMOUNT_FORMAT_REGEX, MAX_INCOME_AMOUNT } from '../../../constants/validation';
import type { PossessionClaimResponse } from '../../../interfaces/ccdCase.interface';
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

export const step: StepDefinition = createFormStep({
  stepName: 'what-other-regular-expenses-do-you-have',
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
    const selected: string[] = [];

    if (fromYesNoEnum(hc.householdBills) === 'yes') {
      selected.push('householdBills');
      if (hc.householdBillsAmount) {
        formData['regularExpenses.householdBillsAmount'] = penceToPounds(hc.householdBillsAmount as string);
      }
      if (hc.householdBillsFrequency) {
        formData['regularExpenses.householdBillsFrequency'] = hc.householdBillsFrequency;
      }
    }

    if (fromYesNoEnum(hc.loanPayments) === 'yes') {
      selected.push('loanPayments');
      if (hc.loanPaymentsAmount) {
        formData['regularExpenses.loanPaymentsAmount'] = penceToPounds(hc.loanPaymentsAmount as string);
      }
      if (hc.loanPaymentsFrequency) {
        formData['regularExpenses.loanPaymentsFrequency'] = hc.loanPaymentsFrequency;
      }
    }

    if (fromYesNoEnum(hc.childSpousalMaintenance) === 'yes') {
      selected.push('childSpousalMaintenance');
      if (hc.childSpousalMaintenanceAmount) {
        formData['regularExpenses.childSpousalMaintenanceAmount'] = penceToPounds(
          hc.childSpousalMaintenanceAmount as string
        );
      }
      if (hc.childSpousalMaintenanceFrequency) {
        formData['regularExpenses.childSpousalMaintenanceFrequency'] = hc.childSpousalMaintenanceFrequency;
      }
    }

    if (fromYesNoEnum(hc.mobilePhone) === 'yes') {
      selected.push('mobilePhone');
      if (hc.mobilePhoneAmount) {
        formData['regularExpenses.mobilePhoneAmount'] = penceToPounds(hc.mobilePhoneAmount as string);
      }
      if (hc.mobilePhoneFrequency) {
        formData['regularExpenses.mobilePhoneFrequency'] = hc.mobilePhoneFrequency;
      }
    }

    if (fromYesNoEnum(hc.groceryShopping) === 'yes') {
      selected.push('groceryShopping');
      if (hc.groceryShoppingAmount) {
        formData['regularExpenses.groceryShoppingAmount'] = penceToPounds(hc.groceryShoppingAmount as string);
      }
      if (hc.groceryShoppingFrequency) {
        formData['regularExpenses.groceryShoppingFrequency'] = hc.groceryShoppingFrequency;
      }
    }

    if (fromYesNoEnum(hc.fuelParkingTransport) === 'yes') {
      selected.push('fuelParkingTransport');
      if (hc.fuelParkingTransportAmount) {
        formData['regularExpenses.fuelParkingTransportAmount'] = penceToPounds(
          hc.fuelParkingTransportAmount as string
        );
      }
      if (hc.fuelParkingTransportFrequency) {
        formData['regularExpenses.fuelParkingTransportFrequency'] = hc.fuelParkingTransportFrequency;
      }
    }

    if (fromYesNoEnum(hc.schoolCosts) === 'yes') {
      selected.push('schoolCosts');
      if (hc.schoolCostsAmount) {
        formData['regularExpenses.schoolCostsAmount'] = penceToPounds(hc.schoolCostsAmount as string);
      }
      if (hc.schoolCostsFrequency) {
        formData['regularExpenses.schoolCostsFrequency'] = hc.schoolCostsFrequency;
      }
    }

    if (fromYesNoEnum(hc.clothing) === 'yes') {
      selected.push('clothing');
      if (hc.clothingAmount) {
        formData['regularExpenses.clothingAmount'] = penceToPounds(hc.clothingAmount as string);
      }
      if (hc.clothingFrequency) {
        formData['regularExpenses.clothingFrequency'] = hc.clothingFrequency;
      }
    }

    if (fromYesNoEnum(hc.otherExpenses) === 'yes') {
      selected.push('otherExpenses');
      if (hc.otherExpensesAmount) {
        formData['regularExpenses.otherExpensesAmount'] = penceToPounds(hc.otherExpensesAmount as string);
      }
      if (hc.otherExpensesFrequency) {
        formData['regularExpenses.otherExpensesFrequency'] = hc.otherExpensesFrequency;
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

    householdCircumstances.householdBills = toYesNoEnum(selected.includes('householdBills') ? 'yes' : 'no');
    if (selected.includes('householdBills')) {
      const amountRaw = req.body?.['regularExpenses.householdBillsAmount'] as string | undefined;
      const frequency = req.body?.['regularExpenses.householdBillsFrequency'] as string | undefined;
      if (amountRaw) {
        householdCircumstances.householdBillsAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.householdBillsFrequency = frequency;
      }
    }

    householdCircumstances.loanPayments = toYesNoEnum(selected.includes('loanPayments') ? 'yes' : 'no');
    if (selected.includes('loanPayments')) {
      const amountRaw = req.body?.['regularExpenses.loanPaymentsAmount'] as string | undefined;
      const frequency = req.body?.['regularExpenses.loanPaymentsFrequency'] as string | undefined;
      if (amountRaw) {
        householdCircumstances.loanPaymentsAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.loanPaymentsFrequency = frequency;
      }
    }

    householdCircumstances.childSpousalMaintenance = toYesNoEnum(
      selected.includes('childSpousalMaintenance') ? 'yes' : 'no'
    );
    if (selected.includes('childSpousalMaintenance')) {
      const amountRaw = req.body?.['regularExpenses.childSpousalMaintenanceAmount'] as string | undefined;
      const frequency = req.body?.['regularExpenses.childSpousalMaintenanceFrequency'] as string | undefined;
      if (amountRaw) {
        householdCircumstances.childSpousalMaintenanceAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.childSpousalMaintenanceFrequency = frequency;
      }
    }

    householdCircumstances.mobilePhone = toYesNoEnum(selected.includes('mobilePhone') ? 'yes' : 'no');
    if (selected.includes('mobilePhone')) {
      const amountRaw = req.body?.['regularExpenses.mobilePhoneAmount'] as string | undefined;
      const frequency = req.body?.['regularExpenses.mobilePhoneFrequency'] as string | undefined;
      if (amountRaw) {
        householdCircumstances.mobilePhoneAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.mobilePhoneFrequency = frequency;
      }
    }

    householdCircumstances.groceryShopping = toYesNoEnum(selected.includes('groceryShopping') ? 'yes' : 'no');
    if (selected.includes('groceryShopping')) {
      const amountRaw = req.body?.['regularExpenses.groceryShoppingAmount'] as string | undefined;
      const frequency = req.body?.['regularExpenses.groceryShoppingFrequency'] as string | undefined;
      if (amountRaw) {
        householdCircumstances.groceryShoppingAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.groceryShoppingFrequency = frequency;
      }
    }

    householdCircumstances.fuelParkingTransport = toYesNoEnum(selected.includes('fuelParkingTransport') ? 'yes' : 'no');
    if (selected.includes('fuelParkingTransport')) {
      const amountRaw = req.body?.['regularExpenses.fuelParkingTransportAmount'] as string | undefined;
      const frequency = req.body?.['regularExpenses.fuelParkingTransportFrequency'] as string | undefined;
      if (amountRaw) {
        householdCircumstances.fuelParkingTransportAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.fuelParkingTransportFrequency = frequency;
      }
    }

    householdCircumstances.schoolCosts = toYesNoEnum(selected.includes('schoolCosts') ? 'yes' : 'no');
    if (selected.includes('schoolCosts')) {
      const amountRaw = req.body?.['regularExpenses.schoolCostsAmount'] as string | undefined;
      const frequency = req.body?.['regularExpenses.schoolCostsFrequency'] as string | undefined;
      if (amountRaw) {
        householdCircumstances.schoolCostsAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.schoolCostsFrequency = frequency;
      }
    }

    householdCircumstances.clothing = toYesNoEnum(selected.includes('clothing') ? 'yes' : 'no');
    if (selected.includes('clothing')) {
      const amountRaw = req.body?.['regularExpenses.clothingAmount'] as string | undefined;
      const frequency = req.body?.['regularExpenses.clothingFrequency'] as string | undefined;
      if (amountRaw) {
        householdCircumstances.clothingAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.clothingFrequency = frequency;
      }
    }

    householdCircumstances.otherExpenses = toYesNoEnum(selected.includes('otherExpenses') ? 'yes' : 'no');
    if (selected.includes('otherExpenses')) {
      const amountRaw = req.body?.['regularExpenses.otherExpensesAmount'] as string | undefined;
      const frequency = req.body?.['regularExpenses.otherExpensesFrequency'] as string | undefined;
      if (amountRaw) {
        householdCircumstances.otherExpensesAmount = poundsToPence(amountRaw);
      }
      if (frequency) {
        householdCircumstances.otherExpensesFrequency = frequency;
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
});
