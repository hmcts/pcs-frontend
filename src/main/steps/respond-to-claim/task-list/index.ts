import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { TFunction } from 'i18next';

import { formatCcdAddress } from '../../utils/ccdAddress';
import { RESPOND_TO_CLAIM_ROUTE, flowConfig } from '../flow.config';
import {
  RESPOND_TO_CLAIM_SECTION_GROUPS,
  type RespondToClaimGroupId,
  respondToClaimSections,
} from '../sections.config';
import { stepRegistry } from '../stepRegistry';

import { createGetController, createStepNavigation, getTranslationFunction } from '@modules/steps';
import type { SectionConfig, SectionStatus } from '@modules/steps/stepFlow.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getDashboardUrl } from '@routes/dashboard';
import type { CcdCaseModel } from '@services/ccdCaseData.model';
import { getAllSectionStatuses, getFirstVisibleStep } from '@services/sectionStatus';
import { getUserVariant } from '@steps';

const stepName = 'task-list';
const journeyName = 'respondToClaim';
const VIEW = 'respond-to-claim/task-list/taskList.njk';

const stepNavigation = createStepNavigation(() => flowConfig);

const redirectLegalrepToDashboard: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (getUserVariant(req) === 'legalrep') {
    return res.redirect(303, getDashboardUrl(req.res?.locals?.validatedCase?.id) ?? '/');
  }
  next();
};

interface TaskListItem {
  title: { text: string };
  href?: string;
  status: { text?: string; tag?: { text: string; classes: string }; classes?: string };
  hint?: { text: string };
}

interface TaskListGroup {
  id: RespondToClaimGroupId;
  number: number;
  title: string;
  items: TaskListItem[];
}

export const step: StepDefinition = {
  url: `${RESPOND_TO_CLAIM_ROUTE}/${stepName}`,
  name: stepName,
  view: VIEW,
  stepDir: __dirname,
  kind: 'interstitial',
  middleware: [redirectLegalrepToDashboard],
  getController: () =>
    createGetController(
      VIEW,
      stepName,
      stepNavigation,
      async (req: Request) => {
        const validatedCase = req.res?.locals.validatedCase;
        const t: TFunction = getTranslationFunction(req, stepName, ['common']);

        const allStatuses = await getAllSectionStatuses(flowConfig, stepRegistry, req);
        const groups = buildGroups(validatedCase, allStatuses, t, req);

        return {
          backUrl: getDashboardUrl(validatedCase?.id) ?? '/',
          propertyAddress: formatCcdAddress(validatedCase?.propertyAddress),
          caseNumber: formatCaseNumber(validatedCase?.id),
          groups,
          iWantToLinks: [
            { key: 'iWantTo.makeApplication', href: '#' },
            { key: 'iWantTo.breathingSpace', href: '#' },
            { key: 'iWantTo.legalAdviser', href: '#' },
          ],
          helpSupportLinks: [
            { key: 'helpSupport.fees', href: 'https://www.gov.uk/get-help-with-court-fees' },
            { key: 'helpSupport.mediation', href: 'https://www.gov.uk/guidance/a-guide-to-civil-mediation' },
            {
              key: 'helpSupport.hearing',
              href: 'https://www.gov.uk/guidance/what-to-expect-coming-to-a-court-or-tribunal',
            },
            { key: 'helpSupport.representYourself', href: 'https://www.gov.uk/represent-yourself-in-court' },
            { key: 'helpSupport.findLegalAdvice', href: 'https://www.gov.uk/find-legal-advice' },
            { key: 'helpSupport.findCourt', href: 'https://www.gov.uk/find-court-tribunal' },
          ],
        };
      },
      journeyName
    ),
};

function buildGroups(
  validatedCase: CcdCaseModel | undefined,
  allStatuses: Map<string, SectionStatus>,
  t: TFunction,
  req: Request
): TaskListGroup[] {
  const caseRef = validatedCase?.id ?? '';
  return RESPOND_TO_CLAIM_SECTION_GROUPS.map((group, index) => {
    const sectionsInGroup = respondToClaimSections.filter(s => s.groupId === group.id);
    const items = sectionsInGroup
      .filter(section => allStatuses.get(section.id) !== 'NOT_APPLICABLE')
      .map(section => buildItem(section, allStatuses.get(section.id) ?? 'AVAILABLE', caseRef, t, req));
    return {
      id: group.id,
      number: index + 1,
      title: t(group.titleKey),
      items,
    };
  });
}

function buildItem(
  section: SectionConfig,
  status: SectionStatus,
  caseRef: string,
  t: TFunction,
  req: Request
): TaskListItem {
  const title = { text: t(section.titleKey) };

  if (status === 'NOT_AVAILABLE_YET') {
    return {
      title,
      // No href → macro renders as non-link greyed text.
      status: { text: t('taskList.status.notAvailableYet'), classes: 'govuk-task-list__status--cannot-start-yet' },
      hint: { text: t('taskList.hint.notAvailableYet') },
    };
  }

  const firstStep = getFirstVisibleStep(section, flowConfig, req);
  const href = firstStep ? `/case/${caseRef}/respond-to-claim/${firstStep}` : undefined;

  if (status === 'DONE') {
    return {
      title,
      href,
      status: { tag: { text: t('taskList.status.done'), classes: 'govuk-tag govuk-tag--green' } },
    };
  }
  if (status === 'IN_PROGRESS') {
    return {
      title,
      href,
      status: { tag: { text: t('taskList.status.inProgress'), classes: 'govuk-tag govuk-tag--blue' } },
    };
  }
  return {
    title,
    href,
    status: { tag: { text: t('taskList.status.available'), classes: 'govuk-tag govuk-tag--turquoise' } },
  };
}

// 4-digit groups, e.g. 1234567890123456 -> "1234 5678 9012 3456".
function formatCaseNumber(caseId: string | undefined): string {
  if (!caseId) {
    return '';
  }
  return caseId.replace(/(\d{4})(?=\d)/g, '$1 ');
}
