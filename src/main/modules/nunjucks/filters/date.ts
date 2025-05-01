import { DateTime } from 'luxon';

export const date = (isoDate: string, format: string = 'd LLLL y') => {
    return DateTime.fromISO(isoDate)
    .setZone('Europe/London')
    .setLocale('en-gb')
    .toFormat(format);
};