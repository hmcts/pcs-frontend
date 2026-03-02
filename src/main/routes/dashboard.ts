import config from 'config';
import type { Application, NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import * as jose from 'jose';

import { HTTPError } from '../HttpError';
import { caseReferenceParamMiddleware } from '../middleware/caseReference';
import { oidcMiddleware } from '../middleware/oidc';
import {
  type DashboardTaskGroup,
  STATUS_MAP,
  TASK_GROUP_MAP,
  getDashboardNotifications,
  getDashboardTaskGroups,
} from '../services/pcsApi';

import { Logger } from '@modules/logger';
import { sanitiseCaseReference, toCaseReference16 } from '@utils/caseReference';
import { safeRedirect303 } from '@utils/safeRedirect';

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

  // Create dedicated router for dashboard routes
  const dashboardRouter = Router({ mergeParams: true });

  // Apply param middleware - dashboard owns this dependency
  // This ensures res.locals.validatedCase is set for routes with :caseReference
  dashboardRouter.param('caseReference', caseReferenceParamMiddleware);

  // Test route to verify auth failure middleware (remove after testing)
  // Test route - requires authentication so it goes through normal auth flow
  // This simulates a downstream service returning 401
  dashboardRouter.get('/test-error/:errorType', oidcMiddleware, (req: Request, res: Response, next: NextFunction) => {
    const errorType = req.params.errorType;
    req.session.returnTo = '/dashboard';

    if (errorType !== '' && errorType !== undefined) {
      next(new HTTPError('Throwing error with error type: ' + errorType, Number(errorType)));
    } else {
      next(new HTTPError('Invalid error type', 400));
    }
  });

  dashboardRouter.get('/test-expired-token', async (req: Request, res: Response) => {
    // eslint-disable-next-line no-console
    console.log('req.session', JSON.stringify(req.session, null, 2));

    logger.info('Testing expired token', {
      event: 'testing_expired_token',
      returnTo: req.session.returnTo,
      originalUrl: req.originalUrl,
      userId: req.session?.user?.uid,
    });
    const user = req.session?.user;
    if (user) {
      // decode the access token and set the expiry to a past date, then set the user.accessToken to the new token
      const decoded = jose.decodeJwt(user.accessToken);
      decoded.exp = Math.floor(Date.now() / 1000) - 60;
      user.accessToken = await new jose.SignJWT(decoded)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('30s')
        .sign(new TextEncoder().encode(config.get<string>('secrets.pcs.pcs-frontend-idam-secret')));
      logger.info('Setting access token to expired token', {
        event: 'setting_access_token_to_expired_token',
        userId: user.uid,
        path: req.originalUrl,
        accessToken: user.accessToken,
        decoded,
      });
      res.redirect('/dashboard');
    } else {
      res.redirect('/login');
    }
  });

  // Route: /dashboard (redirect to case-specific dashboard)
  dashboardRouter.get('/', oidcMiddleware, (req: Request, res: Response) => {
    const caseReference = toCaseReference16(req.session?.ccdCase?.id);
    const dashboardUrl = caseReference ? getDashboardUrl(caseReference) : null;

    if (!dashboardUrl) {
      // No valid case reference - redirect to home
      return safeRedirect303(res, '/', '/', ['/']);
    }

    return safeRedirect303(res, dashboardUrl, '/', ['/dashboard']);
  });

  // Route: /dashboard/:caseReference (main dashboard page)
  dashboardRouter.get('/:caseReference', oidcMiddleware, async (req: Request, res: Response) => {
    const validatedCase = res.locals.validatedCase;

    if (!validatedCase) {
      logger.error('Dashboard: validatedCase is undefined - middleware not executed');
      return res.status(500).render('error', {
        error: 'Case validation failed - validatedCase not set',
      });
    }

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

  // Mount the dashboard router at /dashboard
  app.use('/dashboard', dashboardRouter);
}
