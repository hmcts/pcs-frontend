// import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';

import { CcdCase } from '../interfaces/ccdCase.interface';
import { oidcMiddleware } from '../middleware/oidc';
import { ccdCaseService } from '../services/ccdCaseService';

export default function (app: Application): void {
  // const logger = Logger.getLogger('pui-sample');

  app.get('/pui/:caseReference/caseworkerUpdateCase', oidcMiddleware, async (req: Request, res: Response) => {
    const caseReference: number = parseInt(req.params.caseReference, 10);

    const currentUserId = req.session.user?.uid;

    const caseData = await ccdCaseService.getCaseByReference(caseReference, req.session.user?.accessToken);

    const claimantContactEmail = caseData?.data.claimantContactEmail;

    res.render('pui/caseworkerUpdateCase/emailAddress', {
      claimantContactEmail,
      caseReference,
      currentUserId,
    });
  });

  app.post('/pui/:caseReference/caseworkerUpdateCase', oidcMiddleware, async (req: Request, res: Response) => {
    const caseReferenceString = req.params.caseReference;
    const caseReference: number = parseInt(caseReferenceString, 10);

    const accessToken = req.session.user?.accessToken;

    const ccdCase: CcdCase = {
      id: caseReferenceString,
      data: {
        claimantContactEmail: req.body.claimantContactEmail,
      },
    };

    await ccdCaseService.submitEvent(accessToken, 'caseworkerUpdateCase', ccdCase);

    res.redirect(`https://xui-pcs-api-pr-1083.preview.platform.hmcts.net/cases/case-details/${caseReference}`);
    // res.redirect(`http://localhost:3000/cases/case-details/${caseReference}`);
  });
}
