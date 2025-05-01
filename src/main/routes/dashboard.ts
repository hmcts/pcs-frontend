import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';
import { type DashboardNotification, getDashboardNotifications } from '../services/pcsApi';

const logger = Logger.getLogger('dashboard');

export default function (app: Application): void {
  app.get('/dashboard/:caseReference', async (req: Request, res: Response) => {
    const caseReference: number = parseInt(req.params.caseReference, 10);
    try {
      const notifications: DashboardNotification[] = await getDashboardNotifications(caseReference);
      res.render('dashboard', {
        notifications,
      });
    } catch (e) {
      logger.error(`Failed to fetch notifications for case ${caseReference}. Error was: ${e}`);
      throw e;
    }
  });
}
