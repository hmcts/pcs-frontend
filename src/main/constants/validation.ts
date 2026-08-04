/**
 * Validation constants for income and expenditure forms.
 * Shared across all income/expense related steps.
 */

/** Maximum income/expense amount: £1 billion in pence */
export const MAX_INCOME_AMOUNT = 1_000_000_000;

/** Amount format: up to 10 digits, exactly 2 decimal places */
export const AMOUNT_FORMAT_REGEX = /^\d{1,10}\.\d{2}$/;
