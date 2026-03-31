import { Request } from 'express';

import { isNoticeDateProvided } from './isNoticeDateProvided';
import { isNoticeServed } from './isNoticeServed';
import { isTenancyStartDateKnown } from './isTenancyStartDateKnown';

/**
 * Determines the previous step for dispute pages based on the user's journey.
 *
 * Checks if user came from notice confirmation flow or tenancy date flow.
 * Returns the appropriate previous step for the back button.
 */
export async function getStepBeforeDisputePages(req: Request): Promise<string> {
  const noticeServed = await isNoticeServed(req);
  const noticeDateProvided = await isNoticeDateProvided(req);
  const tenancyStartDateKnown = await isTenancyStartDateKnown(req);
  const confirmNoticeGiven = req.session?.formData?.['confirmation-of-notice-given']?.confirmNoticeGiven;

  // Priority 1: User explicitly disputed notice
  if ((confirmNoticeGiven === 'no' || confirmNoticeGiven === 'imNotSure') && noticeServed) {
    return 'confirmation-of-notice-given';
  }

  // Priority 2: User confirmed notice and date was provided in case
  if (noticeDateProvided && noticeServed) {
    return 'confirmation-of-notice-date-when-provided';
  }

  // Priority 3: User confirmed notice but date was NOT provided in case
  if (!noticeDateProvided && noticeServed) {
    return 'confirmation-of-notice-date-when-not-provided';
  }

  // Priority 4: No notice flow - user came from tenancy date details
  if (tenancyStartDateKnown) {
    return 'tenancy-date-details';
  }

  // Priority 5: No notice flow - user came from tenancy date unknown (fallback)
  return 'tenancy-date-unknown';
}
