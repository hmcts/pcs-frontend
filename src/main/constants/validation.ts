/**
 * Validation constants for income and expenditure forms.
 * Shared across all income/expense related steps.
 */

/** Maximum income/expense amount: £1 billion in pence */
export const MAX_AMOUNT = 1_000_000_000;

/** Amount format: up to 10 digits or 10 digits with exactly 2 decimal places */
export const AMOUNT_FORMAT_REGEX = /^\d{1,10}(?:\.\d{2})?$/;

type AmountValidationOptions = {
  invalidAmountFormatError: string;
  minAmountError: string;
  maxAmountError: string;
};

export const validateAmount = (
  value: unknown,
  { invalidAmountFormatError, minAmountError, maxAmountError }: AmountValidationOptions
): boolean | string => {
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
      return minAmountError;
    }

    if (numericValue >= MAX_AMOUNT) {
      return maxAmountError;
    }
  }

  if (!AMOUNT_FORMAT_REGEX.test(normalized)) {
    return invalidAmountFormatError;
  }

  return true;
};
