/**
 * Utility functions for converting between frontend yes/no values and backend Yes/No enums.
 * Used for CCD API integration where boolean choices are represented as enum strings.
 */

import type { YesNoValue } from '../../interfaces/ccdCase.interface';

/**
 * Converts frontend 'yes'/'no' to backend 'Yes'/'No' enum.
 * @example toYesNoEnum('yes') // returns 'Yes'
 */
export function toYesNoEnum(value: 'yes' | 'no'): YesNoValue {
  return value.toLowerCase() === 'yes' ? 'Yes' : 'No';
}

/**
 * Converts backend 'Yes'/'No' enum to frontend 'yes'/'no'.
 * Case-insensitive for backward compatibility.
 * @example fromYesNoEnum('Yes') // returns 'yes'
 */
export function fromYesNoEnum(value: YesNoValue | string | undefined): 'yes' | 'no' | undefined {
  if (!value) {
    return undefined;
  }
  const normalizedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  if (normalizedValue === 'Yes') {
    return 'yes';
  }
  if (normalizedValue === 'No') {
    return 'no';
  }
  return undefined;
}
