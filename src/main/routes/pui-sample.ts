// import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';

export default function (app: Application): void {
  // const logger = Logger.getLogger('pui-sample');

  app.get('/pui/:caseReference/resumePossessionClaim', oidcMiddleware, async (req: Request, res: Response) => {
    const caseReference: number = parseInt(req.params.caseReference, 10);
    const data = {};
    res.render('pui/resumePossessionClaim/claimantType', {
      data,
      caseReference,
    });
  });

  // app.get('/pui/:caseReference/checkYourAnswers', oidcMiddleware, async (req: Request, res: Response) => {
  //   const caseReference: number = parseInt(req.params.caseReference, 10);
  //   const data = {};
  //   res.render('pui/resumePossessionClaim/checkYourAnswers', {
  //     data,
  //     caseReference,
  //   });
  // });
}
