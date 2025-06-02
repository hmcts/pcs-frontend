import { Request, Response, NextFunction } from 'express';
import { ccdCaseService } from '../services/ccdCaseService';
import { CcdCase } from '../interfaces/ccdCase.interface';

export const ccdCaseMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('ccdCaseMiddleware user ===> ', req.session.user);
    const userId = req.session.user?.uid;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    if(!req.session.ccdCase?.id){
      let caseData: CcdCase | null = await ccdCaseService.getCase(req.session.user);

      if (!caseData) {
        caseData = await ccdCaseService.createCase(req.session.user);
      }

      if(caseData && caseData.id){
        req.session.ccdCase = caseData;
        const address = caseData.data.applicantAddress;
        req.session.formData = {
          ...(req.session.formData || {}),
          'enter-user-details': {
            applicantForename: caseData.data.applicantForename,
            applicantSurname: caseData.data.applicantSurname,
          },
          'enter-address': {
            addressLine1: address.AddressLine1,
            addressLine2: address.AddressLine2,
            addressLine3: address.AddressLine3,
            town: address.PostTown,
            county: address.County,
            postcode: address.PostCode,
            country: address.Country,
          }
        };
      }

    }
    next();
  } catch (err) {
    next(err);
  }
};
