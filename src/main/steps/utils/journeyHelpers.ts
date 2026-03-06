import { Request } from 'express';

import { isNoticeDateProvided } from './isNoticeDateProvided';
import { isNoticeServed } from './isNoticeServed';

export async function getPreviousPageForArrears(req: Request): Promise<string> {
  const noticeServed = await isNoticeServed(req);
  const noticeDateProvided = await isNoticeDateProvided(req);
  const confirmed = req.session?.formData?.['confirmation-of-notice-given']?.confirmNoticeGiven;

  if ((confirmed === 'no' || confirmed === 'imNotSure') && noticeServed) {
    return 'confirmation-of-notice-given';
  }

  if (noticeDateProvided && noticeServed) {
    return 'confirmation-of-notice-date-when-provided';
  }

  if (!noticeDateProvided && noticeServed) {
    return 'confirmation-of-notice-date-when-not-provided';
  }

  return 'tenancy-type-details';
}
