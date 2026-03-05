import type { Request } from 'express';

export const isTenancyStartDateKnown = async (req: Request): Promise<boolean> => {
  const caseData = req.res?.locals.validatedCase?.data;
  const englandTenancyStartDate = caseData?.tenancy_TenancyLicenceDate;
  const walesLicenceStartDate = req.res?.locals?.validatedCase?.data?.licenceStartDate;
  const existingStartDate = englandTenancyStartDate ?? walesLicenceStartDate;

  return existingStartDate !== undefined && existingStartDate !== null && existingStartDate !== '';
};
