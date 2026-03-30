import { Router } from 'express';
import type { Application, Request, Response } from 'express';

import type { CcdCase, CcdCaseAddress } from '../interfaces/ccdCase.interface';
import { caseReferenceParamMiddleware } from '../middleware/caseReference';
import { oidcMiddleware } from '../middleware/oidc';

import { Logger } from '@modules/logger';
import {
  type DashboardTaskGroup,
  STATUS_MAP,
  TASK_GROUP_MAP,
  getDashboardNotifications,
  getDashboardTaskGroups,
} from '@services/pcsApi';
import { arrayToString } from '@utils/arrayToString';
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

function getPropertyAddressFromValidatedCase(validatedCase: CcdCase): string | null {
  const address = (validatedCase.data as { propertyAddress?: CcdCaseAddress | undefined })?.propertyAddress;

  if (!address) {
    return null;
  }

  const formatted = arrayToString([
    address.AddressLine1,
    address.AddressLine2,
    address.AddressLine3,
    address.PostTown,
    address.County,
    address.PostCode,
  ]);

  return formatted || null;
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

    const caseReferenceNumber = Number(validatedCase.id);
    const propertyAddress = getPropertyAddressFromValidatedCase(validatedCase);
    const rawDashboardCaseReference = toCaseReference16(validatedCase.id);
    const dashboardCaseReference = rawDashboardCaseReference
      ? rawDashboardCaseReference.replace(/(\d{4})(?=\d)/g, '$1 ')
      : null;

    try {
      const [notifications, taskGroups] = await Promise.all([
        getDashboardNotifications(caseReferenceNumber),
        getDashboardTaskGroups(caseReferenceNumber).then(mapTaskGroups(app, validatedCase.id)),
      ]);

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
