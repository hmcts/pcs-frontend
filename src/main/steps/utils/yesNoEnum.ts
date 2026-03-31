/**
 * Utility functions for converting between frontend yes/no values and backend YES/NO enums.
 * Used for CCD API integration where boolean choices are represented as enum strings.
 */

import type { VerticalYesNoValue } from '../../interfaces/ccdCase.interface';

/**
 * Converts frontend 'yes'/'no' string to backend CCD enum 'YES'/'NO'
 * @param value - Frontend radio button value ('yes' or 'no')
 * @returns CCD enum value ('YES' or 'NO')
 * @example
 * toYesNoEnum('yes') // returns 'YES'
 * toYesNoEnum('no')  // returns 'NO'
 */
export function toYesNoEnum(value: 'yes' | 'no'): VerticalYesNoValue {
  return value === 'yes' ? 'YES' : 'NO';
}

/**
 * Converts backend CCD enum 'YES'/'NO' to frontend 'yes'/'no' string
 * @param value - CCD enum value ('YES' or 'NO')
 * @returns Frontend radio button value ('yes' or 'no'), or undefined if value is null/invalid
 * @example
 * fromYesNoEnum('YES') // returns 'yes'
 * fromYesNoEnum('NO')  // returns 'no'
 * fromYesNoEnum(null)  // returns undefined
 */
export function fromYesNoEnum(value: VerticalYesNoValue | string | undefined): 'yes' | 'no' | undefined {
  if (value === 'YES') {
    return 'yes';
  }
  if (value === 'NO') {
    return 'no';
  }
  return undefined;
}
