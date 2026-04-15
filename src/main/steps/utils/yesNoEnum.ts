/**
 * Utility functions for converting between frontend yes/no values and backend Yes/No enums.
 * Used for CCD API integration where boolean choices are represented as enum strings.
 */

import type { VerticalYesNoValue, YesNoValue } from '../../interfaces/ccdCase.interface';

/**
 * Converts frontend 'yes'/'no' string to backend CCD enum 'YES'/'NO'
 * @param value - Frontend radio button value ('yes' or 'no')
 * @returns CCD enum value ('YES' or 'NO')
 */
export function toYesNoEnum(value: 'yes' | 'no'): YesNoValue {
  return value === 'yes' ? 'YES' : 'NO';
}

/**
 * Converts backend CCD enum to frontend 'yes'/'no' string, with case-insensitive matching
 * @param value - CCD enum value
 * @returns Frontend radio button value ('yes' or 'no'), or undefined if value is null/invalid
 */
export function fromYesNoEnum(value: YesNoValue | string | null | undefined): 'yes' | 'no' | undefined {
  if (!value) {
    return undefined;
  }
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'yes') {
    return 'yes';
  }
  if (lowerValue === 'no') {
    return 'no';
  }
  return undefined;
}

/**
 * Converts frontend 'yes'/'no' to backend 'YES'/'NO' enum (VerticalYesNo).
 * Used for vertical radio button fields like contactByPhone, contactByText.
 * @example toVerticalYesNoEnum('yes') // returns 'YES'
 */
export function toVerticalYesNoEnum(value: 'yes' | 'no'): VerticalYesNoValue {
  return value.toLowerCase() === 'yes' ? 'YES' : 'NO';
}

/**
 * Converts backend 'YES'/'NO' enum to frontend 'yes'/'no'.
 * Case-insensitive for backward compatibility.
 * @example fromVerticalYesNoEnum('YES') // returns 'yes'
 */
export function fromVerticalYesNoEnum(value: VerticalYesNoValue | string | null | undefined): 'yes' | 'no' | undefined {
  if (!value) {
    return undefined;
  }
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'yes') {
    return 'yes';
  }
  if (lowerValue === 'no') {
    return 'no';
  }
  return undefined;
}
