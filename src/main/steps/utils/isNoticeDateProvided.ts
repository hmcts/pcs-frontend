import type { Request } from 'express';

/**
 * Checks if notice date was provided from CCD case data.
 *
 * Checks multiple possible notice date fields from CCD case data:
 * - notice_HandedOverDateTime (hand delivered)
 * - notice_PostedDate (posted)
 * - notice_OtherElectronicDateTime (electronic)
 *
 * Returns true if any notice date is provided, false otherwise.
 */
export const isNoticeDateProvided = (req: Request): boolean => {
  const { noticeDate } = req.res?.locals.validatedCase ?? { noticeDate: '' };
  return !!noticeDate;
};
