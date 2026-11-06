import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { getRentHistoryDesign } from '@utils/makeAClaimFlags';

/** Resolves the rent history design once per request, for the journey's show conditions to read. */
export const resolveRentHistoryDesign: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  await getRentHistoryDesign(req);
  next();
};
