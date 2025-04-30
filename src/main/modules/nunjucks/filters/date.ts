import { DateTime } from 'luxon';

export const date = (isoDate: string, format: string = 'd LLLL y'): string => {
  return DateTime.fromISO(isoDate, { zone: 'Europe/London', locale: 'en-gb' }).toFormat(format);
};
