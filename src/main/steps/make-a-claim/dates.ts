import type { Request } from 'express';
import { DateTime } from 'luxon';

import { getRequestLanguage } from '@modules/i18n';
import { formatLocalisedDate } from '@utils/formatLocalisedDate';

export function formatClaimDate(isoDate: string | undefined, req: Request): string {
  if (!isoDate) {
    return '';
  }
  return formatLocalisedDate(isoDate, getRequestLanguage(req)) ?? isoDate;
}

/** Today's date in England, as yyyy-MM-dd, whatever the server's time zone. */
export function todayInLondon(now: Date = new Date()): string {
  return DateTime.fromJSDate(now).setZone('Europe/London').toISODate() as string;
}
