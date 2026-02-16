import type { Request } from 'express';

/**
 * Checks if notice was served from CCD case data.
 *
 * Uses noticeServed field from CCD case data.
 * Returns true if noticeServed is "Yes", false otherwise.
 */
export const isNoticeServed = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const noticeServed = caseData?.noticeServed;

  return noticeServed === 'Yes';
};
