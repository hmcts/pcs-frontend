import type { Request } from 'express';

export const isTenancyStartDateKnown = async (req: Request): Promise<boolean> => {
  const { hasTenancyStartDate } = req.res?.locals?.validatedCase ?? { hasTenancyStartDate: false };
  return hasTenancyStartDate;
};
