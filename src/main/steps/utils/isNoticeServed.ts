import type { Request } from 'express';

import { isWalesProperty } from './isWalesProperty';
import { normalizeYesNoValue } from './normalizeYesNoValue';

/**
 * Checks if notice was served from CCD case data.
 *
 * The served-notice flag is country-specific: England claims store it in `noticeServed`,
 * Wales claims in `walesNoticeServed` (pcs-api NoticeOfPossessionView splits by
 * legislativeCountry). Select the field by country and normalise the value to handle
 * any casing ("Yes"/"YES"/"yes").
 */
export const isNoticeServed = (req: Request): boolean => {
  const validatedCase = req.res?.locals.validatedCase;
  const value = isWalesProperty(req) ? validatedCase?.walesNoticeServed : validatedCase?.noticeServed;

  return normalizeYesNoValue(value) === 'YES';
};
