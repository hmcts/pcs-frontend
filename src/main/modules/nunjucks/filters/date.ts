import { DateTime } from 'luxon';

export const date = (isoDateUtc: string, format: string = 'd LLLL y'): string => {
  return DateTime.fromISO(isoDateUtc, { zone: 'utc' }).setZone('Europe/London').setLocale('en-gb').toFormat(format);
};
