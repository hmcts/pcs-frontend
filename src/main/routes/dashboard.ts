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

function sanitiseCaseReference(caseReference: string | number): string | null {
  const caseRefStr = String(caseReference);
  return /^\d{16}$/.test(caseRefStr) ? caseRefStr : null;
}

/**
 * Builds a dashboard URL for a given case reference using a strict allowlist pattern:
 * - Only allows /dashboard/{16-digit-number}
 * - Falls back to DEFAULT_DASHBOARD_URL otherwise
 */
function getDashboardUrl(caseReference?: string | number): string {
  if (!caseReference) {
    return DEFAULT_DASHBOARD_URL;
  }

  const sanitised = sanitiseCaseReference(caseReference);
  if (!sanitised) {
    return DEFAULT_DASHBOARD_URL;
  }

  const url = `${DASHBOARD_ROUTE}/${sanitised}`;

  // Final allowlist check (defence-in-depth)
  return /^\/dashboard\/\d{16}$/.test(url) ? url : DEFAULT_DASHBOARD_URL;
}

function isValidCaseReferenceParam(param: unknown): param is string {
  return typeof param === 'string' && /^\d{16}$/.test(param);
}

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

  /**
   * Safe entrypoint: other controllers can redirect to `/dashboard` (constant)
   * and we resolve the real dashboard URL from validated server-side session state.
   */
  app.get('/dashboard', oidcMiddleware, (req: Request, res: Response) => {
    const caseId = req.session?.ccdCase?.id;
    return res.redirect(303, getDashboardUrl(caseId));
  });

  app.get('/dashboard/:caseReference', oidcMiddleware, async (req: Request, res: Response) => {
    const { caseReference } = req.params;

    if (!isValidCaseReferenceParam(caseReference)) {
      return res.status(400).send('Invalid case reference');
    }

    const caseReferenceNumber = Number(caseReference);

    try {
      const [notifications, taskGroups] = await Promise.all([
        getDashboardNotifications(caseReferenceNumber),
        getDashboardTaskGroups(caseReferenceNumber).then(mapTaskGroups(app, caseReference)),
      ]);

      return res.render('dashboard', {
        notifications,
        taskGroups,
      });
    } catch (e) {
      logger.error(`Failed to fetch dashboard data for case ${caseReference}. Error was: ${String(e)}`);
      throw e;
    }
  });
}
