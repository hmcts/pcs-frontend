import { Router } from 'express';
import type { Application, Request, Response } from 'express';

import { caseReferenceParamMiddleware } from '../middleware/caseReference';
import { oidcMiddleware } from '../middleware/oidc';

import { Logger } from '@modules/logger';
import { ccdCaseService } from '@services/ccdCaseService';
import type { DashboardTaskGroup, TaskStatus } from '@services/pcsApi/dashboardTaskGroup.interface';
import { STATUS_MAP, TASK_GROUP_MAP } from '@services/pcsApi/dashboardTaskGroup.interface';
import { sanitiseCaseReference, toCaseReference16 } from '@utils/caseReference';
import { resolveNotification, resolveTaskHint, resolveTaskTitle } from '@utils/resolveDashboardTemplates';
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

function mapTaskGroup(taskGroup: DashboardTaskGroup, caseReference: string): MappedTaskGroup {
  const taskGroupId = taskGroup.groupId.toLowerCase();

  return {
    groupId: taskGroup.groupId,
    title: TASK_GROUP_MAP[taskGroup.groupId] ?? taskGroup.groupId,
    tasks: taskGroup.tasks.map((task): MappedTask => {
      const hint = resolveTaskHint(task.templateId, task.templateValues);
      const presentation = STATUS_MAP[task.status as TaskStatus];

      return {
        title: { html: resolveTaskTitle(task.templateId) },
        hint,
        href: presentation?.linkable ? `/dashboard/${caseReference}/${taskGroupId}/${task.templateId}` : undefined,
        status: presentation?.tag ? { tag: presentation.tag } : {},
      };
    }),
  };
}

export default function dashboardRoutes(app: Application): void {
  const logger = Logger.getLogger('dashboard');

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

      const notifications = dashboardData.notifications.map(n =>
        resolveNotification(n.templateId, n.templateValues as Record<string, unknown>)
      );

      const taskGroups = dashboardData.taskGroups.map(tg => mapTaskGroup(tg, validatedCase.id));

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
