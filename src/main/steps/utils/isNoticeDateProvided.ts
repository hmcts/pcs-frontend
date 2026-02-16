import type { Request } from 'express';

/**
 * Checks if notice date was provided from CCD case data.
 *
 * Uses notice_NoticeHandedOverDateTime field from CCD case data.
 * Returns true if notice date is provided, false otherwise.
 * Also stores the date in session for use in subsequent steps.
 */
export const isNoticeDateProvided = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals?.validatedCase?.data;
  const noticeDate = caseData?.notice_NoticeHandedOverDateTime;

  if (noticeDate) {
    req.session.noticeDate = noticeDate;
  }

  return !!noticeDate;
};
