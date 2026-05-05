import type { Request } from 'express';

export const isTenancyStartDateKnown = (req: Request): boolean => {
  const { hasTenancyStartDate } = req.res?.locals?.validatedCase ?? { hasTenancyStartDate: false };
  return hasTenancyStartDate;
};
