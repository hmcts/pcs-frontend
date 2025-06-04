import { Request, Response, NextFunction } from 'express';
import { ccdCaseService } from '../services/ccdCaseService';
import { CcdCase } from '../interfaces/ccdCase.interface';
import { mapCaseDataToFormData } from '../app/utils/sessionCaseMapper';

export const ccdCaseMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.user?.uid;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    console.log('req.session.ccdCase => ', req.session.ccdCase);
    if(!req.session.ccdCase?.id){
      let caseData: CcdCase | null = await ccdCaseService.getCase(req.session.user);

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
