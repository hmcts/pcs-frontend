const CURRENCY_FORMAT_REGEX = /^(\d{1,10})(\.\d{1,2})?$/;

const CURRENCY_INPUT_PATTERN = '[0-9]{1,10}(\\.[0-9]{1,2})?';

// HTML input attributes for currency amount fields
export const CURRENCY_INPUT_ATTRIBUTES: Record<string, string | boolean> = {
  inputmode: 'numeric',
  pattern: CURRENCY_INPUT_PATTERN,
  spellcheck: false,
};

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

  // Remove whitespace from the value
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  // Remove commas to handle user input like 1,234.56
  const normalized = trimmed.split(',').join('');

  // Check if the value is a number and within the minimum and maximum allowed values
  const numericValue = Number(normalized);
  if (!Number.isNaN(numericValue)) {
    if (numericValue < min) {
      return `${errorPrefix}.negativeAmount`;
    }
    // Check if the value is greater than the maximum allowed value
    if (numericValue > max) {
      return `${errorPrefix}.largeAmount`;
    }
  }
  // Then check strict format (same rule as CURRENCY_INPUT_ATTRIBUTES.pattern)
  if (!CURRENCY_FORMAT_REGEX.exec(normalized)) {
    return `${errorPrefix}.format`;
  }

  return undefined;
}
