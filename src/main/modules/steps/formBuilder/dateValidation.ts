import type { TFunction } from 'i18next';

/**
 * Date validation utilities for form fields
 */

const DEFAULT_DATE_ERROR_MESSAGE = 'Enter a valid date';

// Date part validation constants
const DATE_PART_CONSTRAINTS = {
  day: { maxLength: 2, min: 1, max: 31 },
  month: { maxLength: 2, min: 1, max: 12 },
  year: { maxLength: 4, min: 1801, max: 9999, noLeadingZero: true },
} as const;

const DATE_PARTS = ['day', 'month', 'year'] as const;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(month: number, year: number): number {
  // Month should be validated before calling this function (1-12)
  // If invalid month is passed, return 0 to indicate invalid date
  if (month < 1 || month > 12) {
    return 0;
  }

  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return daysInMonth[month - 1];
}

function getDateErrorMessage(
  t?: TFunction,
  partSpecificKey?: 'futureDate',
  translations?: Record<string, string>
): string {
  if (partSpecificKey === 'futureDate' && translations?.dateFutureDate) {
    return translations.dateFutureDate;
  }
  if (!t) {
    return DEFAULT_DATE_ERROR_MESSAGE;
  }
  const key = partSpecificKey === 'futureDate' ? 'errors.date.futureDate' : 'errors.date.notRealDate';
  const translated = t(key);
  return translated !== key ? translated : DEFAULT_DATE_ERROR_MESSAGE;
}

function getMissingDatePartsError(missingParts: string[], t?: TFunction): string {
  if (!t) {
    return DEFAULT_DATE_ERROR_MESSAGE;
  }

  const translate = (key: string, params?: Record<string, string>): string => {
    const translated = params ? t(key, params) : t(key);
    return translated !== key ? translated : DEFAULT_DATE_ERROR_MESSAGE;
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
 * Checks if a string is numeric
 */
function isNumeric(s: string): boolean {
  return /^\d+$/.test(s);
}

/**
 * Validates a single date part (day, month, or year)
 */
function validateDatePart(
  value: string,
  maxLength: number,
  min: number,
  max: number,
  errorKey: 'invalidDay' | 'invalidMonth' | 'invalidYear',
  t?: TFunction,
  translations?: Record<string, string>,
  noLeadingZero = false
): string | null {
  if (!value) {
    return null;
  }

  const isInvalidFormat = !isNumeric(value) || value.length > maxLength || (noLeadingZero && value.startsWith('0'));

  if (isInvalidFormat) {
    return getDateErrorMessage(t, undefined, translations);
  }

  const num = parseInt(value, 10);
  return num < min || num > max ? getDateErrorMessage(t, undefined, translations) : null;
}

/**
 * Checks if all required date parts are present
 */
function checkRequiredParts(
  day: string,
  month: string,
  year: string,
  requireAllParts: boolean,
  t?: TFunction
): string | null {
  const hasDay = !!day;
  const hasMonth = !!month;
  const hasYear = !!year;
  const hasAllParts = hasDay && hasMonth && hasYear;

  if (requireAllParts && !hasAllParts) {
    const missingParts = DATE_PARTS.filter((part, idx) => {
      return (idx === 0 && !hasDay) || (idx === 1 && !hasMonth) || (idx === 2 && !hasYear);
    });
    return getMissingDatePartsError(missingParts, t);
  }

  if (!requireAllParts && !hasDay && !hasMonth && !hasYear) {
    return null;
  }

  return null;
}

/**
 * Validates that the complete date is valid (e.g., day exists in the month)
 */
function validateCompleteDate(
  day: string,
  month: string,
  year: string,
  t?: TFunction,
  translations?: Record<string, string>
): string | null {
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

  return null;
}

/**
 * Checks if the date is in the future (when noFutureDate is true)
 */
function checkFutureDate(
  day: string,
  month: string,
  year: string,
  noFutureDate: boolean,
  noCurrentDate: boolean,
  t?: TFunction,
  translations?: Record<string, string>
): string | null {
  if (!noFutureDate) {
    return null;
  }

  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
    return null;
  }

  const inputDate = new Date(yearNum, monthNum - 1, dayNum);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);

  const isInvalid = noCurrentDate ? inputDate >= today : inputDate > today;
  if (isInvalid) {
    return getDateErrorMessage(t, 'futureDate', translations);
  }

  return null;
}

export interface DateFieldError {
  message: string;
  erroneousParts?: ('day' | 'month' | 'year')[];
}

/**
 * Validates a date field with day, month, and year components
 * @param day - Day value as string
 * @param month - Month value as string
 * @param year - Year value as string
 * @param requireAllParts - Whether all parts (day, month, year) are required
 * @param t - Translation function for error messages
 * @param noFutureDate - If true, disallows future and current dates
 * @param noCurrentDate - If true, disallows current/todays date
 * @param translations - Optional translations object for error messages
 * @returns DateFieldError object if validation fails, null if valid
 */
export function validateDateField(
  day: string,
  month: string,
  year: string,
  requireAllParts: boolean,
  t?: TFunction,
  noFutureDate = false,
  noCurrentDate = true,
  translations?: Record<string, string>
): DateFieldError | null {
  const hasDay = !!day;
  const hasMonth = !!month;
  const hasYear = !!year;
  const hasAllParts = hasDay && hasMonth && hasYear;

  // Check required parts first
  const requiredError = checkRequiredParts(day, month, year, requireAllParts, t);
  if (requiredError) {
    // Determine which parts are missing
    const missingParts: ('day' | 'month' | 'year')[] = [];
    if (!hasDay) {
      missingParts.push('day');
    }
    if (!hasMonth) {
      missingParts.push('month');
    }
    if (!hasYear) {
      missingParts.push('year');
    }

    // If all parts missing or 2+ parts missing, it's a generic error (anchor to day)
    // If exactly one part missing, specify that part
    return {
      message: requiredError,
      erroneousParts: missingParts.length === 1 ? missingParts : undefined,
    };
  }

  // Validate individual date parts
  const dayError = validateDatePart(
    day,
    DATE_PART_CONSTRAINTS.day.maxLength,
    DATE_PART_CONSTRAINTS.day.min,
    DATE_PART_CONSTRAINTS.day.max,
    'invalidDay',
    t,
    translations
  );
  if (dayError) {
    return {
      message: dayError,
      erroneousParts: ['day'],
    };
  }

  const monthError = validateDatePart(
    month,
    DATE_PART_CONSTRAINTS.month.maxLength,
    DATE_PART_CONSTRAINTS.month.min,
    DATE_PART_CONSTRAINTS.month.max,
    'invalidMonth',
    t,
    translations
  );
  if (monthError) {
    return {
      message: monthError,
      erroneousParts: ['month'],
    };
  }

  const yearError = validateDatePart(
    year,
    DATE_PART_CONSTRAINTS.year.maxLength,
    DATE_PART_CONSTRAINTS.year.min,
    DATE_PART_CONSTRAINTS.year.max,
    'invalidYear',
    t,
    translations,
    DATE_PART_CONSTRAINTS.year.noLeadingZero
  );
  if (yearError) {
    return {
      message: yearError,
      erroneousParts: ['year'],
    };
  }

  // If not all parts are present, validation stops here
  if (!hasAllParts) {
    return null;
  }

  // Validate complete date (e.g., day exists in month)
  const completeDateError = validateCompleteDate(day, month, year, t, translations);
  if (completeDateError) {
    // Generic error - could be day or month issue, anchor to day
    return {
      message: completeDateError,
      erroneousParts: undefined,
    };
  }

  // Check for future dates if restricted
  const futureDateError = checkFutureDate(day, month, year, noFutureDate, noCurrentDate, t, translations);
  if (futureDateError) {
    // Generic error - anchor to day
    return {
      message: futureDateError,
      erroneousParts: undefined,
    };
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
