import { Logger } from '@hmcts/nodejs-logging';
import config from 'config';
import type { Application, NextFunction, Request, Response } from 'express';
import * as jose from 'jose';

import { HTTPError } from '../HttpError';
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

  // Test route to verify auth failure middleware (remove after testing)
  // Test route - requires authentication so it goes through normal auth flow
  // This simulates a downstream service returning 401
  app.get('/test-error/:errorType', oidcMiddleware, (req: Request, res: Response, next: NextFunction) => {
    const errorType = req.params.errorType;
    req.session.returnTo = '/dashboard';

    if (errorType !== '' && errorType !== undefined) {
      next(new HTTPError('Invalid error type', Number(errorType)));
    } else {
      next(new HTTPError('Invalid error type', 400));
    }
  });

  app.get('/test-expired-token', async (req: Request, res: Response) => {
    const user = req.session?.user;
    if (user) {
      // decode the access token and set the expiry to a past date, then set the user.accessToken to the new token
      const decoded = jose.decodeJwt(user.accessToken);
      decoded.exp = Math.floor(Date.now() / 1000) - 60;
      user.accessToken = await new jose.SignJWT(decoded)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('30s')
        .sign(new TextEncoder().encode(config.get<string>('secrets.pcs.pcs-frontend-idam-secret')));
      res.redirect('/dashboard');
    } else {
      res.redirect('/login');
    }
  });

  app.get('/dashboard', oidcMiddleware, (req: Request, res: Response) => {
    const caseId = req.session?.ccdCase?.id;
    const validatedCaseId = caseId ? sanitiseCaseReference(caseId) : null;
    const redirectUrl = getDashboardUrl(validatedCaseId ?? undefined);
    const allowedPattern = /^\/dashboard(\/\d{16})?$/;
    if (!allowedPattern.test(redirectUrl)) {
      return res.redirect(303, DEFAULT_DASHBOARD_URL);
    }
    return res.redirect(303, redirectUrl);
  });

  app.get('/dashboard/:caseReference', oidcMiddleware, async (req: Request, res: Response) => {
    const sanitisedCaseReference = req.params.caseReference;
    const caseReferenceNumber = Number(sanitisedCaseReference);

    try {
      const [notifications, taskGroups] = await Promise.all([
        getDashboardNotifications(caseReferenceNumber),
        getDashboardTaskGroups(caseReferenceNumber).then(mapTaskGroups(app, sanitisedCaseReference)),
      ]);

      return res.render('dashboard', {
        notifications,
        taskGroups,
      });
    } catch (e) {
      logger.error(`Failed to fetch dashboard data for case ${sanitisedCaseReference}. Error was: ${String(e)}`);
      throw e;
    }
  });
}
