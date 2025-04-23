import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';

import { DashboardNotification } from '../services/pcsApi/dashboardNotification.interface';
import { getDashboardNotifications } from '../services/pcsApi/pcsApiService';

const logger = Logger.getLogger('dashboard');

export default function (app: Application): void {
  app.get('/dashboard/:caseReference', async (req: Request, res: Response) => {
    const caseReference : number = parseInt(req.params.caseReference, 10);

    let dashboardNotifications : DashboardNotification[] = [];
    try {
      dashboardNotifications = await getDashboardNotifications(caseReference);
    } catch (e) {
      logger.error(`Failed to fetch notifications for case ${caseReference}. Error was: ${e}`);
      dashboardNotifications.push({
        templateId: 'Error.Notifications.FailedToFetch',
        templateValues: {}
      });
    }

    const renderedNotifications: string[] = dashboardNotifications.map(
      dashboardNotification => renderNotification(app, dashboardNotification)
    );

    res.render('dashboard', {
      notifications: renderedNotifications,
    });
  });

}

function renderNotification(app: Application, dashboardNotification: DashboardNotification) {
  return app.locals.nunjucksEnv.render(`dashboard-notifications/${dashboardNotification.templateId}.njk`,
    dashboardNotification.templateValues);
}
