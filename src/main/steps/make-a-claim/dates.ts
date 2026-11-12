import type { Request } from 'express';

import { getRequestLanguage } from '@modules/i18n';
import { formatLocalisedDate } from '@utils/formatLocalisedDate';

export function formatClaimDate(isoDate: string | undefined, req: Request): string {
  if (!isoDate) {
    return '';
  }
  return formatLocalisedDate(isoDate, getRequestLanguage(req)) ?? isoDate;
}

export { todayInLondon } from '@utils/formatLocalisedDate';
