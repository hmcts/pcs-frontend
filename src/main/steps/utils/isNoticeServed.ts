import type { Request } from 'express';

/**
 * Checks if notice was served from CCD case data.
 *
 * Uses noticeServed field from CCD case data.
 * Returns true if noticeServed is "Yes" (case-insensitive), false otherwise.
 */
export const isNoticeServed = (req: Request): boolean => {
  const { noticeServed } = req.res?.locals?.validatedCase ?? { noticeServed: '' };

  // Case-insensitive comparison to handle "Yes", "YES", "yes", etc.
  return noticeServed?.toUpperCase() === 'YES';
};
