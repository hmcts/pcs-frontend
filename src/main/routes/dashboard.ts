import { Logger } from '@hmcts/nodejs-logging';
import type { Application, Request, Response } from 'express';

import { oidcMiddleware } from '../middleware/oidc';
import {
  type DashboardTaskGroup,
  STATUS_MAP,
  TASK_GROUP_MAP,
  getDashboardNotifications,
  getDashboardTaskGroups,
} from '../services/pcsApi';
import { sanitiseCaseReference } from '../utils/caseReference';

interface MappedTask {
  title: { html: string };
  hint?: { html: string };
  href?: string;
  status: {
    text?: string;
    tag?: { text: string; classes?: string };
  };
}

interface MappedTaskGroup {
  groupId: DashboardTaskGroup['groupId'];
  title: string;
  tasks: MappedTask[];
}

export const DASHBOARD_ROUTE = '/dashboard';
const DEFAULT_DASHBOARD_URL = `${DASHBOARD_ROUTE}/1234567890123456`; // TODO: remove hardcoded fake CCD caseId when CCD backend is setup

export const getDashboardUrl = (caseReference?: string | number): string => {
  if (!caseReference) {
    return DEFAULT_DASHBOARD_URL;
  }

  const sanitised = sanitiseCaseReference(caseReference);
  if (!sanitised) {
    return DEFAULT_DASHBOARD_URL;
  }

  const url = `${DASHBOARD_ROUTE}/${sanitised}`;
  return /^\/dashboard\/\d{16}$/.test(url) ? url : DEFAULT_DASHBOARD_URL;
};

function mapTaskGroups(app: Application, caseReference: string) {
  return (taskGroups: DashboardTaskGroup[]): MappedTaskGroup[] => {
    return taskGroups.map(taskGroup => {
      const mappedTitle = TASK_GROUP_MAP[taskGroup.groupId];

      return {
        groupId: taskGroup.groupId,
        title: mappedTitle,
        tasks: taskGroup.tasks.map(task => {
          if (!app.locals.nunjucksEnv) {
            throw new Error('Nunjucks environment not initialized');
          }

          const taskGroupId = taskGroup.groupId.toLowerCase();

          const hint =
            task.templateValues.dueDate || task.templateValues.deadline
              ? {
                  html: app.locals.nunjucksEnv.render(
                    `components/taskGroup/${taskGroupId}/${task.templateId}-hint.njk`,
                    task.templateValues
                  ),
                }
              : undefined;

          return {
            title: {
              html: app.locals.nunjucksEnv.render(
                `components/taskGroup/${taskGroupId}/${task.templateId}.njk`,
                task.templateValues
              ),
            },
            hint,
            // Absolute internal link is more robust than a relative one
            href:
              task.status === 'NOT_AVAILABLE'
                ? undefined
                : `/dashboard/${caseReference}/${taskGroupId}/${task.templateId}`,
            status: STATUS_MAP[task.status],
          };
        }),
      };
    });
  };
}

export default function dashboardRoutes(app: Application): void {
  const logger = Logger.getLogger('dashboard');

  app.get('/dashboard', oidcMiddleware, (req: Request, res: Response) => {
    const caseId = req.session?.ccdCase?.id;
    const redirectUrl = getDashboardUrl(caseId);
    if (!redirectUrl?.startsWith('/')) {
      return res.redirect(303, '/error');
    }
    return res.redirect(303, redirectUrl);
  });

  app.get('/dashboard/:caseReference', oidcMiddleware, async (req: Request, res: Response) => {
    const validatedCase = res.locals.validatedCase;
    const caseReferenceNumber = Number(validatedCase.id);

    try {
      const [notifications, taskGroups] = await Promise.all([
        getDashboardNotifications(caseReferenceNumber),
        getDashboardTaskGroups(caseReferenceNumber).then(mapTaskGroups(app, validatedCase.id)),
      ]);

      return res.render('dashboard', {
        notifications,
        taskGroups,
      });
    } catch (e) {
      logger.error(`Failed to fetch dashboard data for case ${validatedCase.id}. Error was: ${String(e)}`);
      throw e;
    }
  });
}
