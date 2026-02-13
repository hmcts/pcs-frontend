/**
 * Currency amount validation for form fields (e.g. £123.45 format).
 */

export function isValidCurrencyAmount(
  value: unknown,
  options: { max?: number } = {}
): boolean {
  const { max = 1000000000 } = options;

  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  // Require 1–10 digits, a decimal point, then exactly 2 decimal places
  const match = trimmed.match(/^(\d{1,10})\.(\d{2})$/);
  if (!match) {
    return false;
  }

  const numericValue = Number(trimmed);
  if (Number.isNaN(numericValue)) {
    return false;
  }

  // Upper limit (default £1,000,000,000.00)
  return numericValue <= max;
}
