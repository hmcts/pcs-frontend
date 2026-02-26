import type { Request } from 'express';

export const isTenancyStartDateKnown = async (req: Request): Promise<boolean> => {
    const caseData = req.res?.locals.validatedCase?.data;
    const tenancyStartDateKnown = caseData?.tenancy_TenancyLicenceDate;
    return tenancyStartDateKnown !== undefined && tenancyStartDateKnown !== null && tenancyStartDateKnown !== '';
};