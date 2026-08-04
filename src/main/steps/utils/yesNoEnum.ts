/**
 * Utility functions for converting between frontend yes/no values and backend Yes/No enums.
 * Used for CCD API integration where boolean choices are represented as enum strings.
 */

import type { YesNoNotSureValue, YesNoValue } from '@services/ccdCase.interface';

export type YesNoNotSureFormValue = 'yes' | 'no' | 'notSure';

/**
 * Converts frontend 'yes'/'no' string to backend CCD enum 'Yes'/'No'
 * @param value - Frontend radio button value ('yes' or 'no')
 * @returns CCD enum value ('YES' or 'NO')
 * @example
 * toYesNoEnum('yes') // returns 'YES'
 * toYesNoEnum('no')  // returns 'NO'
 * toYesNoEnum(undefined)  // returns undefined
 */
export function toYesNoEnum(value: 'yes' | 'no' | undefined): YesNoValue | undefined {
  if (!value) {
    return undefined;
  }
  return value.toLowerCase() === 'yes' ? 'YES' : 'NO';
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
 * Converts a frontend 'yes' / 'no' / 'notSure' value to backend CCD enum
 * 'YES' / 'NO' / 'NOT_SURE'.
 */
export function toYesNoNotSureEnum(value: string | undefined): YesNoNotSureValue | undefined {
  if (value === 'yes') {
    return 'YES';
  }
  if (value === 'no') {
    return 'NO';
  }
  if (value === 'notSure') {
    return 'NOT_SURE';
  }
  return undefined;
}

/**
 * Converts a backend CCD 'YES' / 'NO' / 'NOT_SURE' enum to its frontend form value.
 */
export function fromYesNoNotSureEnum(
  value: YesNoNotSureValue | string | null | undefined
): YesNoNotSureFormValue | undefined {
  if (!value) {
    return undefined;
  }
  const upper = value.toUpperCase();
  if (upper === 'YES') {
    return 'yes';
  }
  if (upper === 'NO') {
    return 'no';
  }
  if (upper === 'NOT_SURE') {
    return 'notSure';
  }
  return undefined;
}
