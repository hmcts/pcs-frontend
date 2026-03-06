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
  const { notice_NoticeHandedOverDateTime, notice_NoticePostedDate, notice_NoticeOtherElectronicDateTime } = req.res
    ?.locals?.validatedCase ?? {
    notice_NoticeHandedOverDateTime: '',
    notice_NoticePostedDate: '',
    notice_NoticeOtherElectronicDateTime: '',
  };

  // Check all possible notice date fields (different service methods use different fields)
  const noticeDate =
    notice_NoticeHandedOverDateTime || // Hand delivered
    notice_NoticePostedDate || // Posted
    notice_NoticeOtherElectronicDateTime; // Electronic

  return !!noticeDate;
};
