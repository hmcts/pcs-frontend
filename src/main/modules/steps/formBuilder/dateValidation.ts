import type { TFunction } from 'i18next';

/**
 * Date validation utilities for form fields
 */

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(month: number, year: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return daysInMonth[month - 1] || 31;
}

function getDateErrorMessage(
  t?: TFunction,
  partSpecificKey?: 'invalidDay' | 'invalidMonth' | 'invalidYear' | 'futureDate',
  translations?: Record<string, string>
): string {
  if (partSpecificKey === 'futureDate' && translations?.dateFutureDate) {
    return translations.dateFutureDate;
  }
  if (!t) {
    return 'Enter a valid date';
  }
  const key = partSpecificKey ? `errors.date.${partSpecificKey}` : 'errors.date.notRealDate';
  const translated = t(key);
  return translated !== key ? translated : 'Enter a valid date';
}

function getMissingDatePartsError(missingParts: string[], t?: TFunction): string {
  if (!t) {
    return 'Enter a valid date';
  }

  const translate = (key: string, params?: Record<string, string>): string => {
    const translated = params ? t(key, params) : t(key);
    return translated !== key ? translated : 'Enter a valid date';
  };

  if (missingParts.length === 3) {
    return translate('errors.date.required');
  }

  if (missingParts.length === 2) {
    return translate('errors.date.missingTwo', { first: missingParts[0], second: missingParts[1] });
  }

  if (missingParts.length === 1) {
    return translate('errors.date.missingOne', { missingField: missingParts[0] });
  }

  return translate('errors.date.required');
}

/**
 * Validates a date field with day, month, and year components
 * @param day - Day value as string
 * @param month - Month value as string
 * @param year - Year value as string
 * @param requireAllParts - Whether all parts (day, month, year) are required
 * @param t - Translation function for error messages
 * @param noFutureDate - If true, disallows future and current dates
 * @param translations - Optional translations object for error messages
 * @returns Error message string if validation fails, null if valid
 */
export function validateDateField(
  day: string,
  month: string,
  year: string,
  requireAllParts: boolean,
  t?: TFunction,
  noFutureDate = false,
  translations?: Record<string, string>
): string | null {
  const isNumeric = (s: string) => /^\d+$/.test(s);
  const hasDay = !!day;
  const hasMonth = !!month;
  const hasYear = !!year;
  const hasAllParts = hasDay && hasMonth && hasYear;

  if (requireAllParts && !hasAllParts) {
    const missingParts = ['day', 'month', 'year'].filter((part, idx) => {
      return (idx === 0 && !hasDay) || (idx === 1 && !hasMonth) || (idx === 2 && !hasYear);
    });
    return getMissingDatePartsError(missingParts, t);
  }

  if (!requireAllParts && !hasDay && !hasMonth && !hasYear) {
    return null;
  }

  const validateDatePart = (
    value: string,
    maxLength: number,
    min: number,
    max: number,
    errorKey: 'invalidDay' | 'invalidMonth' | 'invalidYear',
    noLeadingZero = false
  ): string | null => {
    if (!value) {
      return null;
    }
    const isInvalidFormat = !isNumeric(value) || value.length > maxLength || (noLeadingZero && value.startsWith('0'));
    if (isInvalidFormat) {
      return getDateErrorMessage(t, errorKey, translations);
    }
    const num = parseInt(value, 10);
    return num < min || num > max ? getDateErrorMessage(t, errorKey, translations) : null;
  };

  const dayError = validateDatePart(day, 2, 1, 31, 'invalidDay');
  if (dayError) {
    return dayError;
  }

  const monthError = validateDatePart(month, 2, 1, 12, 'invalidMonth');
  if (monthError) {
    return monthError;
  }

  const yearError = validateDatePart(year, 4, 1, 9999, 'invalidYear', true);
  if (yearError) {
    return yearError;
  }

  if (!hasAllParts) {
    return null;
  }

  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
    return null;
  }

  const maxDays = getDaysInMonth(monthNum, yearNum);
  if (dayNum > maxDays) {
    return getDateErrorMessage(t, undefined, translations);
  }

  if (noFutureDate) {
    const inputDate = new Date(yearNum, monthNum - 1, dayNum);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    inputDate.setHours(0, 0, 0, 0);

    if (inputDate >= today) {
      return getDateErrorMessage(t, 'futureDate', translations);
    }
  }

  return null;
}

/**
 * Maps nested date error keys to translation keys
 * @param nestedKey - The nested error key (e.g., 'required', 'missingOne')
 * @returns The corresponding translation key or null
 */
export function getDateTranslationKey(nestedKey: string): string | null {
  const keyMap: Record<string, string> = {
    required: 'dateRequired',
    missingOne: 'dateMissingOne',
    missingTwo: 'dateMissingTwo',
    futureDate: 'dateFutureDate',
  };
  return keyMap[nestedKey] || null;
}
