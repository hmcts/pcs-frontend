import { DateTime } from 'luxon';

export type DateStyle = 'long' | 'ordinal' | 'weekday' | 'short' | 'time';

const UK_ZONE = 'Europe/London';
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const FORMATS: Record<Exclude<DateStyle, 'ordinal'>, string> = {
  long: 'd MMMM yyyy',
  weekday: 'cccc d MMMM yyyy',
  short: 'd MMM yyyy',
  time: 'HH:mm',
};

const ENGLISH_ORDINAL_SUFFIXES: Record<string, string> = { one: 'st', two: 'nd', few: 'rd', other: 'th' };

/** Maps an application language code to the Luxon locale used for date formatting. */
export function toDateLocale(language?: string): string {
  return language?.toLowerCase() === 'cy' ? 'cy' : 'en-gb';
}

/**
 * Parses a CCD date or timestamp into UK time. Date-only values (`2024-03-20`) keep their calendar date;
 * timestamps without an offset are treated as UTC, which is how CCD stores them.
 */
export function toUkDateTime(value: unknown): DateTime | undefined {
  let dateTime: DateTime | undefined;
  if (value instanceof Date) {
    dateTime = DateTime.fromJSDate(value);
  } else if (typeof value === 'string' && value.trim()) {
    const text = value.trim();
    dateTime = DATE_ONLY.test(text)
      ? DateTime.fromISO(text, { zone: UK_ZONE })
      : DateTime.fromISO(text, { zone: 'utc' });
    if (!dateTime.isValid) {
      dateTime = DateTime.fromSQL(text, { zone: 'utc' });
    }
  }
  return dateTime?.isValid ? dateTime.setZone(UK_ZONE) : undefined;
}

/**
 * Formats a date for display in the user's language: `20 March 2024` / `20 Mawrth 2024`.
 * Welsh has no ordinal form here, so `ordinal` gives `20th March 2024` in English and `20 Mawrth 2024` in Welsh.
 * Returns undefined when the value is not a valid date.
 */
export function formatLocalisedDate(value: unknown, lang?: string, style: DateStyle = 'long'): string | undefined {
  const dateTime = toUkDateTime(value)?.setLocale(toDateLocale(lang));
  if (!dateTime) {
    return undefined;
  }

  if (style === 'ordinal') {
    if (dateTime.locale !== 'en-gb') {
      return dateTime.toFormat(FORMATS.long);
    }
    const suffix = ENGLISH_ORDINAL_SUFFIXES[new Intl.PluralRules('en-GB', { type: 'ordinal' }).select(dateTime.day)];
    return `${dateTime.day}${suffix ?? ENGLISH_ORDINAL_SUFFIXES.other} ${dateTime.toFormat('MMMM yyyy')}`;
  }

  return dateTime.toFormat(FORMATS[style]);
}
