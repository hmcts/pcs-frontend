/**
 * Utility functions for converting between frontend yes/no values and backend YES/NO enums.
 * Used for CCD API integration where boolean choices are represented as enum strings.
 */

import type { VerticalYesNoValue, YesNoValue } from '../../interfaces/ccdCase.interface';

/**
 * Converts frontend 'yes'/'no' string to backend CCD YesOrNo enum ('Yes'/'No')
 * @param value - Frontend radio button value ('yes' or 'no')
 * @returns CCD enum value ('Yes' or 'No')
 * @example
 * toYesNoEnum('yes') // returns 'Yes'
 * toYesNoEnum('no')  // returns 'No'
 * toYesNoEnum(undefined)  // returns undefined
 */
export function toYesNoEnum(value: 'yes' | 'no' | undefined): YesNoValue | undefined {
  if (!value) {
    return undefined;
  }
  return value.toLowerCase() === 'yes' ? 'Yes' : 'No';
}

/**
 * Converts frontend 'yes'/'no' string to backend CCD enum 'YES'/'NO'
 * @param value - Frontend radio button value ('yes' or 'no')
 * @returns CCD enum value ('YES' or 'NO')
 * @example
 * toVerticalYesNoEnum('yes') // returns 'YES'
 * toVerticalYesNoEnum('no')  // returns 'NO'
 */
export function toVerticalYesNoEnum(value: 'yes' | 'no'): VerticalYesNoValue {
  return value === 'yes' ? 'YES' : 'NO';
}

/**
 * Converts backend CCD enum 'YES'/'NO' to frontend 'yes'/'no' string
 * @param value - CCD enum value ('YES' or 'NO')
 * @returns Frontend radio button value ('yes' or 'no'), or undefined if value is null/invalid
 * @example
 * fromVerticalYesNoEnum('YES') // returns 'yes'
 * fromVerticalYesNoEnum('NO')  // returns 'no'
 * fromVerticalYesNoEnum(null)  // returns undefined
 */
export function fromVerticalYesNoEnum(value: VerticalYesNoValue | string | undefined): 'yes' | 'no' | undefined {
  if (value === 'YES') {
    return 'yes';
  }
  if (value === 'NO') {
    return 'no';
  }
  return undefined;
}
