import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { getRentHistoryDesign } from '@utils/makeAClaimFlags';

/** Resolves the rent history design once per request, for the journey's show conditions to read. */
export const resolveRentHistoryDesign: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  res.locals.rentHistoryDesign = await getRentHistoryDesign(req);
  next();
};
