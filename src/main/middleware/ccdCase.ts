import { NextFunction, Request, Response } from 'express';

import { CcdCase } from '../interfaces/ccdCase.interface';
import { ccdCaseService } from '../services/ccdCaseService';

export const ccdCaseMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.session.user?.uid;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    if (!req.session.ccdCase?.id) {
      const caseData: CcdCase | null = await ccdCaseService.getCase(req.session.user?.accessToken);

      if (caseData && caseData.id) {
        // Only store caseId in session (not full case data) to reduce Redis storage
        // Full case data is fetched fresh on each page via START event
        req.session.ccdCase = { id: caseData.id, data: {} };
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};
