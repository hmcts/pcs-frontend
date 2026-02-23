import type { Request } from 'express';

/**
 * Checks if notice date was provided from CCD case data.
 *
 * Uses notice_NoticeHandedOverDateTime field from CCD case data.
 * Returns true if notice date is provided, false otherwise.
 */
export const isNoticeDateProvided = async (req: Request): Promise<boolean> => {
  // Read from CCD (fresh data from START callback via res.locals.validatedCase)
  // Same pattern as free-legal-advice - no session dependency
  const caseData = req.res?.locals?.validatedCase?.data;
  const noticeDate = caseData?.notice_NoticeHandedOverDateTime;

  return !!noticeDate;
};
