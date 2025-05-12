import { Logger } from '@hmcts/nodejs-logging';
import { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware';
import { OIDCModule } from '../modules/oidc/oidc';
import {
  type DashboardNotification,
  type DashboardTaskGroup,
  STATUS_MAP,
  TASK_GROUP_MAP,
  getDashboardNotifications,
  getDashboardTaskGroups,
} from '../services/pcsApi';

export default function (app: Application): void {
  const logger = Logger.getLogger('dashboard');
  app.get('/dashboard/:caseReference', oidcMiddleware, async (req: Request, res: Response) => {
    const caseReference: number = parseInt(req.params.caseReference, 10);
    try {
      const callbackUrl = OIDCModule.getCurrentUrl(req);
      logger.info(JSON.stringify(req.headers));
      const data: [DashboardNotification[], DashboardTaskGroup[]] = await Promise.all([
        getDashboardNotifications(caseReference),
        getDashboardTaskGroups(caseReference, callbackUrl.origin),
      ]);

      const taskGroups = data[1].map(taskGroup => {
        const mappedTitle = TASK_GROUP_MAP[taskGroup.groupId];
        return {
          ...taskGroup,
          title: mappedTitle,
          tasks: taskGroup.tasks.map(task => {
            if (!app.locals.nunjucksEnv) {
              throw new Error('Nunjucks environment not initialized');
            }

            const tag = STATUS_MAP[task.status];
            const taskGroupId = taskGroup.groupId.toLowerCase();
            return {
              title: {
                html: app.locals.nunjucksEnv.render(
                  `components/taskGroup/${taskGroupId}/${task.templateId}.njk`,
                  task.templateValues
                ),
              },
              href: `${caseReference}/${taskGroupId}/${task.templateId}`,
              status: {
                text: task.status,
                tag,
              },
            };
          }),
        };
      });

      res.render('dashboard', {
        notifications: data[0],
        taskGroups,
      });
    } catch (e) {
      logger.error(`Failed to fetch dashboard data for case ${caseReference}. Error was: ${e}`);
      throw e;
    }
  });
}
