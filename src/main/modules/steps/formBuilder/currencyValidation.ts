/**
 * Currency amount validation for form fields (e.g. £123.45 format).
 * Returns undefined if valid, or an error key string if invalid.
 *
 * This allows reusable validation logic while each page defines its own error messages.
 *
 * @param value - The value to validate
 * @param options - Validation options
 * @param options.max - Maximum allowed value (default: 1,000,000,000)
 * @param options.min - Minimum allowed value (default: 0)
 * @param options.errorPrefix - Prefix for error keys (e.g. 'errors.rentArrears')
 * @returns undefined if valid, or error key string like 'errors.rentArrears.rentArrearsFormat'
 *
 * @example
 * validate: value => validateCurrencyAmount(value, {
 *   max: 1000000000,
 *   min: 0,
 *   errorPrefix: 'errors.rentArrears'
 * })
 *
 */

export function validateCurrencyAmount(
  value: unknown,
  options: {
    max?: number;
    min?: number;
    errorPrefix: string;
  }
): string | undefined {
  const { max = 1000000000, min = 0, errorPrefix } = options;

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    // Let the required + errorMessage handle empty values
    return undefined;
  }

  // Remove commas to handle user input like 1,234.56
  const normalized = trimmed.split(',').join('');

  // First, try to parse as a number to check value ranges
  // This allows us to give better error messages for large numbers
  const numericValue = Number(normalized);
  if (!Number.isNaN(numericValue)) {
    if (numericValue < min) {
      return `${errorPrefix}.rentArrearsNegativeAmount`;
    }

    if (numericValue > max) {
      return `${errorPrefix}.rentArrearsLargeAmount`;
    }
  }

  // Then check strict format: 1–10 digits, a decimal point, exactly 2 decimal places
  const formatRegex = /^(\d{1,10})\.(\d{2})$/;
  if (!formatRegex.exec(normalized)) {
    return `${errorPrefix}.rentArrearsFormat`;
  }

  return undefined;
}
