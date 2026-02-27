import type { Request } from 'express';

/**
 * Checks if notice date was provided from CCD case data.
 *
 * Checks multiple possible notice date fields from CCD case data:
 * - notice_NoticeHandedOverDateTime (hand delivered)
 * - notice_NoticePostedDate (posted)
 * - notice_NoticeOtherElectronicDateTime (electronic)
 *
 * Returns true if any notice date is provided, false otherwise.
 */
export const isNoticeDateProvided = async (req: Request): Promise<boolean> => {
  // Read from CCD (fresh data from START callback via res.locals.validatedCase)
  // Same pattern as free-legal-advice - no session dependency
  const caseData = req.res?.locals?.validatedCase?.data;

  // Check all possible notice date fields (different service methods use different fields)
  const noticeDate =
    caseData?.notice_NoticeHandedOverDateTime || // Hand delivered
    caseData?.notice_NoticePostedDate || // Posted
    caseData?.notice_NoticeOtherElectronicDateTime; // Electronic

  return !!noticeDate;
};
