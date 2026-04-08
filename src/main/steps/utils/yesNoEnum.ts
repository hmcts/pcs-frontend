/**
 * Utility functions for converting between frontend yes/no values and backend Yes/No enums.
 * Used for CCD API integration where boolean choices are represented as enum strings.
 */

import type { YesNoValue } from '../../interfaces/ccdCase.interface';

/**
 * Converts frontend 'yes'/'no' string to backend CCD enum 'Yes'/'No'
 * @param value - Frontend radio button value ('yes' or 'no')
 * @returns CCD enum value ('Yes' or 'No')
 * @example
 * toYesNoEnum('yes') // returns 'Yes'
 * toYesNoEnum('no')  // returns 'No'
 */
export function toYesNoEnum(value: 'yes' | 'no'): YesNoValue {
  return value === 'yes' ? 'Yes' : 'No';
}

/**
 * Converts backend CCD enum to frontend 'yes'/'no' string.
 * Accepts title-case ('Yes'/'No') and legacy uppercase ('YES'/'NO') values.
 * @param value - CCD enum value
 * @returns Frontend radio button value ('yes' or 'no'), or undefined if value is null/invalid
 * @example
 * fromYesNoEnum('Yes') // returns 'yes'
 * fromYesNoEnum('No')  // returns 'no'
 * fromYesNoEnum(null)  // returns undefined
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
