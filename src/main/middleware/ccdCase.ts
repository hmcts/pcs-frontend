import { NextFunction, Request, Response } from 'express';

import { mapCaseDataToFormData } from '../app/utils/sessionCaseMapper';
import { CcdCase } from '../interfaces/ccdCase.interface';
import { ccdCaseService } from '../services/ccdCaseService';

export const ccdCaseMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.user?.uid;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    if (!req.session.ccdCase?.id) {
      const caseData: CcdCase | null = await ccdCaseService.getCase(req.session.user);

      if (caseData && caseData.id) {
        req.session.ccdCase = caseData;
        const mappedFormData = mapCaseDataToFormData(caseData);
        req.session.formData = {
          ...(req.session.formData || {}),
          ...mappedFormData,
        };
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};
