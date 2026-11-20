import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { formatCcdAddress } from '../../utils/ccdAddress';
import { propertyAddressOf } from '../claimMapping';
import { MAKE_A_CLAIM_JOURNEY, MAKE_A_CLAIM_ROUTE, flowConfig } from '../flow.config';
import { sharedPageContent } from '../formStep';
import { makeAClaimSectionConfirmation } from '../sectionConfirmation';
import { MAKE_A_CLAIM_SECTION_GROUPS, makeAClaimSections } from '../sections.config';
import { stepRegistry } from '../stepRegistry';

import { createGetController, createStepNavigation, getTranslationFunction } from '@modules/steps';
import { getStepUrl } from '@modules/steps/flow';
import type { SectionStatus } from '@modules/steps/stepFlow.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';
import { getAllSectionStatuses, getFirstVisibleStep, getStatusTagClasses } from '@services/sectionStatus';
import { formatCaseReferenceForDisplay } from '@utils/caseReference';

const stepName = 'task-list';
const VIEW = 'make-a-claim/templates/taskList.njk';

const stepNavigation = createStepNavigation(() => flowConfig);

interface TaskListItem {
  title: { text: string };
  href?: string;
  status: { tag: { text: string; classes: string } };
}

async function buildGroups(req: Request, t: TFunction) {
  const statuses = await getAllSectionStatuses(flowConfig, stepRegistry, req, makeAClaimSectionConfirmation);
  const caseId = req.res?.locals.validatedCase?.id;
  return MAKE_A_CLAIM_SECTION_GROUPS.map((group, index) => ({
    id: group.id,
    number: index + 1,
    title: t(group.titleKey),
    items: makeAClaimSections
      .filter(section => section.groupId === group.id)
      .filter(section => statuses.get(section.id) !== 'NOT_APPLICABLE')
      .map((section): TaskListItem => {
        const status: SectionStatus = statuses.get(section.id) ?? 'AVAILABLE';
        const firstStep = status === 'NOT_AVAILABLE_YET' ? undefined : getFirstVisibleStep(section, flowConfig, req);
        return {
          title: { text: t(section.titleKey) },
          href: firstStep ? getStepUrl(firstStep, flowConfig, caseId) : undefined,
          status: { tag: { text: t(`taskList.status.${status}`), classes: getStatusTagClasses(status) ?? '' } },
        };
      }),
  }));
}

export const step: StepDefinition = {
  url: `${MAKE_A_CLAIM_ROUTE}/${stepName}`,
  name: stepName,
  view: VIEW,
  stepDir: __dirname,
  getController: () =>
    createGetController(VIEW, stepName, stepNavigation, async (req: Request) => {
      const t = getTranslationFunction(req, [MAKE_A_CLAIM_JOURNEY, 'common']);
      const validatedCase = req.res?.locals.validatedCase;
      return {
        ...sharedPageContent(req),
        backUrl: undefined,
        propertyAddress: formatCcdAddress({ ...propertyAddressOf(req), Country: undefined }),
        caseNumber: formatCaseReferenceForDisplay(validatedCase?.id ?? ''),
        groups: await buildGroups(req, t),
      };
    }),
};
