import { Request } from 'express';

import { isNoticeDateProvided } from './isNoticeDateProvided';
import { isNoticeServed } from './isNoticeServed';

export async function getPreviousPageForArrears(req: Request): Promise<string> {
  const noticeServed = await isNoticeServed(req);
  const noticeDateProvided = await isNoticeDateProvided(req);
  const confirmNoticeGiven = req.res?.locals?.validatedCase?.defendantResponsesConfirmNoticeGiven;

  // User rejected or unsure about notice: back to the question page (CCD-backed, survives logout)
  if ((confirmNoticeGiven === 'no' || confirmNoticeGiven === 'imNotSure') && noticeServed) {
    return 'confirmation-of-notice-given';
  }

  if (noticeDateProvided && noticeServed) {
    return 'confirmation-of-notice-date-when-provided';
  }

  if (!noticeDateProvided && noticeServed) {
    return 'confirmation-of-notice-date-when-not-provided';
  }

  return 'tenancy-details';
}
