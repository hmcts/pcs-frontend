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
import { sanitiseCaseReference, toCaseReference16 } from '../utils/caseReference';
import { safeRedirect303 } from '../utils/safeRedirect';

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

export const getDashboardUrl = (caseReference?: string | number): string | null => {
  if (!caseReference) {
    return null;
  }

  const sanitised = sanitiseCaseReference(caseReference);
  if (!sanitised) {
    return null;
  }

  return `${DASHBOARD_ROUTE}/${sanitised}`;
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
    const caseReference = toCaseReference16(req.session?.ccdCase?.id);
    const dashboardUrl = caseReference ? getDashboardUrl(caseReference) : null;

    if (!dashboardUrl) {
      // No valid case reference - redirect to home
      return safeRedirect303(res, '/', '/', ['/']);
    }

    return safeRedirect303(res, dashboardUrl, '/', ['/dashboard']);
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
