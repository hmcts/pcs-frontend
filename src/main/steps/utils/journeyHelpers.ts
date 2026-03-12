import { Request } from 'express';

import { isNoticeDateProvided } from './isNoticeDateProvided';
import { isNoticeServed } from './isNoticeServed';
import { isTenancyStartDateKnown } from './isTenancyStartDateKnown';

export async function getPreviousPageForArrears(req: Request): Promise<string> {
  const noticeServed = await isNoticeServed(req);
  const noticeDateProvided = await isNoticeDateProvided(req);
  const tenancyStartDateKnown = await isTenancyStartDateKnown(req);
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

  if (tenancyStartDateKnown) {
    return 'tenancy-date-details';
  }

  return 'tenancy-date-unknown';
}
