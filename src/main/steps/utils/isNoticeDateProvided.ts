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
  const { noticeDate } = req.res?.locals?.validatedCase ?? { noticeDate: '' };
  return !!noticeDate;
};
