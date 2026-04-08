/**
 * Utility functions for converting between pounds (frontend) and pence (backend).
 * Backend stores currency amounts as integers in pence to avoid floating point issues.
 */

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('currencyConversion');

/**
 * Converts pence (backend) to pounds (frontend display)
 * @param pence - Amount in pence as string or number
 * @returns Amount in pounds with 2 decimal places, or undefined if invalid
 * @example
 * penceToPounds('14850') // returns '148.50'
 * penceToPounds(14850)   // returns '148.50'
 * penceToPounds(null)    // returns undefined
 */
export function penceToPounds(pence: string | number | undefined): string | undefined {
  // Explicit check: 0 is valid (£0.00), !pence would incorrectly reject it
  if (pence === undefined || pence === null || pence === '') {
    return undefined;
  }

  const penceValue = typeof pence === 'string' ? parseFloat(pence) : pence;

  if (Number.isNaN(penceValue)) {
    logger.warn(`Invalid pence value (NaN): ${pence}`);
    return undefined;
  }

  const pounds = penceValue / 100;
  return pounds.toFixed(2);
}

/**
 * Converts pounds (frontend) to pence (backend storage)
 * Handles comma-separated input and rounds to nearest pence
 * @param pounds - Amount in pounds as string (may contain commas)
 * @returns Amount in pence as string, or undefined if invalid
 * @example
 * poundsToPence('148.50')   // returns '14850'
 * poundsToPence('1,234.56') // returns '123456'
 * poundsToPence('invalid')  // returns undefined
 */
export function poundsToPence(pounds: string | undefined): string | undefined {
  if (!pounds) {
    return undefined;
  }

  // Remove commas from formatted input
  const normalized = pounds.replace(/,/g, '');
  const poundsValue = parseFloat(normalized);

  if (Number.isNaN(poundsValue)) {
    logger.warn(`Invalid pounds value (NaN): ${pounds}`);
    return undefined;
  }

  // Round to nearest pence (avoids floating point issues)
  const pence = Math.round(poundsValue * 100);
  return String(pence);
}
