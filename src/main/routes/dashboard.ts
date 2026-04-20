import { Router } from 'express';
import type { Application, Request, Response } from 'express';
import type { TFunction } from 'i18next';

import { caseReferenceParamMiddleware } from '../middleware/caseReference';
import { oidcMiddleware } from '../middleware/oidc';

import { getTranslationFunction } from '@modules/i18n';
import { Logger } from '@modules/logger';
import { ccdCaseService } from '@services/ccdCaseService';
import { getTagClasses, isLinkableStatus } from '@services/pcsApi/dashboardTaskGroup.interface';
import type { DashboardTaskGroup } from '@services/pcsApi/dashboardTaskGroup.interface';
import { sanitiseCaseReference, toCaseReference16 } from '@utils/caseReference';
import { lookup, resolveNotification, resolveTask } from '@utils/resolveDashboardTemplates';
import { safeRedirect303 } from '@utils/safeRedirect';

interface MappedTask {
  title: { html: string };
  href?: string;
  status: {
    tag?: { text: string; classes: string };
  };
}

interface MappedTaskGroup {
  groupId: DashboardTaskGroup['groupId'];
  title: string;
  tasks: MappedTask[];
}

export const DASHBOARD_ROUTE = '/dashboard';

const HELP_SUPPORT_LINKS: { key: string; href: string }[] = [
  { key: 'helpWithFees', href: 'https://www.gov.uk/get-help-with-court-fees' },
  { key: 'findOutAboutMediation', href: 'https://www.gov.uk/guidance/a-guide-to-civil-mediation' },
  {
    key: 'whatToExpectAtTheHearing',
    href: 'https://www.gov.uk/guidance/what-to-expect-coming-to-a-court-or-tribunal',
  },
  { key: 'representMyselfAtTheHearing', href: 'https://www.gov.uk/represent-yourself-in-court' },
  { key: 'findLegalAdvice', href: 'https://www.gov.uk/find-legal-advice' },
  { key: 'findInformation', href: 'https://www.gov.uk/find-court-tribunal' },
];

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

export default function dashboardRoutes(app: Application): void {
  const logger = Logger.getLogger('dashboard');

  function mapTaskGroup(tg: DashboardTaskGroup, t: TFunction, caseReference: string): MappedTaskGroup {
    const groupIdLower = tg.groupId.toLowerCase();
    const groupTitle = lookup(t, `dashboard:taskGroups.${tg.groupId}`);
    if (!groupTitle) {
      logger.warn(`No dashboard translation for task group ${tg.groupId}`);
    }

    return {
      groupId: tg.groupId,
      title: groupTitle ?? tg.groupId,
      tasks: tg.tasks
        .map((task): MappedTask | null => {
          const resolved = resolveTask(t, task.templateId);
          if (!resolved) {
            logger.warn(`No dashboard translation for task templateId=${task.templateId}`);
            return null;
          }

          const linkable = isLinkableStatus(task.status);
          const classes = getTagClasses(task.status);
          const tagText = classes ? lookup(t, `dashboard:tasks.statuses.${task.status}`) : null;

          return {
            title: { html: resolved.title },
            href: linkable ? `/dashboard/${caseReference}/${groupIdLower}/${task.templateId}` : undefined,
            status: tagText && classes ? { tag: { text: tagText, classes } } : {},
          };
        })
        .filter((x): x is MappedTask => x !== null),
    };
  }

  // Create dedicated router for dashboard routes
  const dashboardRouter = Router({ mergeParams: true });

  dashboardRouter.use(oidcMiddleware);

  // Apply param middleware - dashboard owns this dependency
  // This ensures res.locals.validatedCase is set for routes with :caseReference
  dashboardRouter.param('caseReference', caseReferenceParamMiddleware);

  // Route: /dashboard (redirect to case-specific dashboard)
  dashboardRouter.get('/', (req: Request, res: Response) => {
    // cannot redirect to dashboard as we don't have a case reference
    return safeRedirect303(res, '/', '/', ['/']);
  });

  // Route: /dashboard/:caseReference (main dashboard page)
  dashboardRouter.get('/:caseReference', async (req: Request, res: Response) => {
    const validatedCase = res.locals.validatedCase;

    if (!validatedCase) {
      logger.error('Dashboard: validatedCase is undefined - middleware not executed');
      return res.status(500).render('error', {
        error: 'Case validation failed - validatedCase not set',
      });
    }

    const accessToken = req.session.user?.accessToken;
    if (!accessToken) {
      logger.error('Dashboard: user not authenticated - no access token');
      return res.status(401).render('error', { error: 'Authentication required' });
    }

    const rawDashboardCaseReference = toCaseReference16(validatedCase.id);
    const dashboardCaseReference = rawDashboardCaseReference
      ? rawDashboardCaseReference.replace(/(\d{4})(?=\d)/g, '$1 ')
      : null;

    try {
      console.log('[dashboard route] Fetching dashboardView for case:', validatedCase.id);
      const dashboardData = await ccdCaseService.getDashboardView(accessToken, validatedCase.id);

      const t = getTranslationFunction(req, ['dashboard', 'common']);
      const caseReference = validatedCase.id;

      const notifications = dashboardData.notifications
        .map(n => {
          const resolved = resolveNotification(
            t,
            n.templateId,
            n.templateValues as Record<string, unknown>,
            caseReference
          );
          if (!resolved) {
            logger.warn(`No dashboard translation for notification templateId=${n.templateId}`);
          }
          return resolved;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const taskGroups = dashboardData.taskGroups.map(tg => mapTaskGroup(tg, t, caseReference));

      const propertyAddress = dashboardData.propertyAddress ?? null;

      console.log('[dashboard route] Resolved notifications for view:', JSON.stringify(notifications, null, 2));
      console.log('[dashboard route] Resolved taskGroups for view:', JSON.stringify(taskGroups, null, 2));
      console.log('[dashboard route] Property address:', propertyAddress);

      return res.render('dashboard', {
        notifications,
        taskGroups,
        propertyAddress,
        dashboardCaseReference,
        helpSupportLinks: HELP_SUPPORT_LINKS,
      });
    } catch (e) {
      logger.error(`Failed to fetch dashboard data for case ${validatedCase.id}. Error was: ${String(e)}`);
      throw e;
    }
  });

  // Mount the dashboard router at /dashboard
  app.use('/dashboard', dashboardRouter);
}
