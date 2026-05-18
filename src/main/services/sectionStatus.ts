import type { Request } from 'express';

import type { JourneyFlowConfig, SectionConfig, SectionStatus } from '../modules/steps/stepFlow.interface';
import type { StepDefinition } from '../modules/steps/stepFormData.interface';
import {
  type RespondToClaimSectionId,
  sectionHasCya,
  sectionIdToBackendEnum,
} from '../steps/respond-to-claim/sections.config';

export type { SectionStatus, SectionConfig, JourneyFlowConfig } from '../modules/steps/stepFlow.interface';
export type { StepDefinition } from '../modules/steps/stepFormData.interface';

const STATUS_TAG_CLASSES: Partial<Record<SectionStatus, string>> = {
  AVAILABLE: 'govuk-tag govuk-tag--turquoise',
  IN_PROGRESS: 'govuk-tag govuk-tag--blue',
  DONE: 'govuk-tag govuk-tag--green',
};

export const getStatusTagClasses = (status: SectionStatus): string | undefined => STATUS_TAG_CLASSES[status];

export function getFirstVisibleStep(
  section: SectionConfig,
  flowConfig: JourneyFlowConfig,
  req: Request
): string | undefined {
  return section.steps.find(stepName => isStepVisible(stepName, flowConfig, req));
}

export async function getAllSectionStatuses(
  flowConfig: JourneyFlowConfig,
  stepRegistry: Record<string, StepDefinition>,
  req: Request
): Promise<Map<string, SectionStatus>> {
  if (!flowConfig.sections) {
    throw new Error(
      'getAllSectionStatuses called with a flowConfig that has no sections. ' +
        'Section status is only meaningful for sectionalised journeys. ' +
        `Flow: ${flowConfig.journeyName ?? '(unnamed)'}.`
    );
  }

  const { ordered, cyclicIds } = analyseSectionGraph(flowConfig.sections);
  // validateSectionConfig runs at startup and would have rejected a cyclic config, so cyclicIds is
  // normally empty here. Defensive fallback: append cyclic ids in declaration order so the page renders.
  const orderedIds = cyclicIds.length === 0 ? ordered : [...ordered, ...cyclicIds];
  const sectionById = new Map(flowConfig.sections.map(s => [s.id, s]));
  const statuses = new Map<string, SectionStatus>();

  for (const sectionId of orderedIds) {
    const section = sectionById.get(sectionId);
    if (!section) {
      continue;
    }
    const status = await getSectionStatus(section, flowConfig, stepRegistry, req, statuses);
    statuses.set(sectionId, status);
  }

  return statuses;
}

export async function getSectionStatus(
  section: SectionConfig,
  flowConfig: JourneyFlowConfig,
  stepRegistry: Record<string, StepDefinition>,
  req: Request,
  allStatuses: ReadonlyMap<string, SectionStatus>
): Promise<SectionStatus> {
  assertSectionalisedFlow(flowConfig, section.id);

  if (await isSectionNotApplicable(section, req)) {
    return 'NOT_APPLICABLE';
  }
  if (hasUnsatisfiedDependencies(section, allStatuses)) {
    return 'NOT_AVAILABLE_YET';
  }

  const questionSteps = visibleQuestionSteps(section, stepRegistry, flowConfig, req);
  if (questionSteps.length === 0) {
    return 'NOT_APPLICABLE';
  }

  const raw = scoreAnsweredness(questionSteps, req);
  if (raw !== 'DONE' || !sectionHasCya(section)) {
    return raw;
  }
  return userHasConfirmedSectionViaCya(section, req) ? 'DONE' : 'IN_PROGRESS';
}

function userHasConfirmedSectionViaCya(section: SectionConfig, req: Request): boolean {
  const confirmed = req.res?.locals?.validatedCase?.defendantResponses?.confirmedSections ?? [];
  return confirmed.includes(sectionIdToBackendEnum(section.id as RespondToClaimSectionId));
}

export class SectionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SectionConfigError';
  }
}

export function validateSectionConfig(flowConfig: JourneyFlowConfig): void {
  if (!flowConfig.sections) {
    return;
  }

  const sections = flowConfig.sections;
  const journeyLabel = flowConfig.journeyName ?? '(unnamed journey)';

  assertUniqueIds(sections, journeyLabel);
  assertReferencesResolve(sections, journeyLabel);
  const { cyclicIds } = analyseSectionGraph(sections);
  if (cyclicIds.length > 0) {
    throw new SectionConfigError(
      `Journey '${journeyLabel}' has cyclic dependency among sections: ${cyclicIds.join(', ')}.`
    );
  }
}

// Kahn's algorithm: returns the topologically sorted ids plus any ids that couldn't be ordered
// (i.e. participate in a cycle). Used both for ordering renders and for cycle detection at startup.
function analyseSectionGraph(sections: readonly SectionConfig[]): { ordered: string[]; cyclicIds: string[] } {
  const ids = sections.map(s => s.id);
  const idSet = new Set(ids);
  const inDegree = new Map<string, number>(ids.map(id => [id, 0]));
  const adjacency = new Map<string, string[]>(ids.map(id => [id, []]));

  for (const section of sections) {
    for (const depId of section.dependsOn ?? []) {
      if (!idSet.has(depId)) {
        continue;
      }
      adjacency.get(depId)!.push(section.id);
      inDegree.set(section.id, (inDegree.get(section.id) ?? 0) + 1);
    }
  }

  const ordered: string[] = [];
  const ready = ids.filter(id => inDegree.get(id) === 0);

  while (ready.length > 0) {
    const nextId = ready.shift()!;
    ordered.push(nextId);
    for (const dependentId of adjacency.get(nextId) ?? []) {
      const newDegree = (inDegree.get(dependentId) ?? 0) - 1;
      inDegree.set(dependentId, newDegree);
      if (newDegree === 0) {
        ready.push(dependentId);
      }
    }
  }

  const cyclicIds = ids.filter(id => !ordered.includes(id));
  return { ordered, cyclicIds };
}

function assertSectionalisedFlow(flowConfig: JourneyFlowConfig, sectionId: string): void {
  if (!flowConfig.sections) {
    throw new Error(
      `getSectionStatus called on non-sectionalised flow '${flowConfig.journeyName ?? '(unnamed)'}' ` +
        `for section '${sectionId}'.`
    );
  }
}

async function isSectionNotApplicable(section: SectionConfig, req: Request): Promise<boolean> {
  return Boolean(section.isApplicable && !(await section.isApplicable(req)));
}

function hasUnsatisfiedDependencies(section: SectionConfig, allStatuses: ReadonlyMap<string, SectionStatus>): boolean {
  if (!section.dependsOn?.length) {
    return false;
  }
  return section.dependsOn.some(depId => {
    const depStatus = allStatuses.get(depId);
    return depStatus !== 'DONE' && depStatus !== 'NOT_APPLICABLE';
  });
}

interface RegisteredStep {
  stepName: string;
  step: StepDefinition;
}

function visibleQuestionSteps(
  section: SectionConfig,
  stepRegistry: Record<string, StepDefinition>,
  flowConfig: JourneyFlowConfig,
  req: Request
): RegisteredStep[] {
  return section.steps
    .map(stepName => ({ stepName, step: stepRegistry[stepName] }))
    .filter((entry): entry is RegisteredStep => entry.step !== undefined)
    .filter(({ step }) => step.isAnswered !== undefined)
    .filter(({ stepName }) => isStepVisible(stepName, flowConfig, req));
}

function scoreAnsweredness(questionSteps: RegisteredStep[], req: Request): SectionStatus {
  const answeredCount = questionSteps.filter(({ step }) => safeIsAnswered(step, req)).length;
  if (answeredCount === 0) {
    return 'AVAILABLE';
  }
  if (answeredCount < questionSteps.length) {
    return 'IN_PROGRESS';
  }
  return 'DONE';
}

function isStepVisible(stepName: string, flowConfig: JourneyFlowConfig, req: Request): boolean {
  const stepConfig = flowConfig.steps[stepName];
  if (!stepConfig?.showCondition) {
    return true;
  }
  return stepConfig.showCondition(req);
}

// A thrown isAnswered must not crash the task-list — treat as unanswered.
export function safeIsAnswered(step: StepDefinition, req: Request): boolean {
  if (!step.isAnswered) {
    return false;
  }
  try {
    return step.isAnswered(req);
  } catch {
    return false;
  }
}

function assertUniqueIds(sections: readonly SectionConfig[], journeyLabel: string): void {
  const seen = new Set<string>();
  for (const section of sections) {
    if (seen.has(section.id)) {
      throw new SectionConfigError(`Journey '${journeyLabel}' has duplicate section id '${section.id}'.`);
    }
    seen.add(section.id);
  }
}

function assertReferencesResolve(sections: readonly SectionConfig[], journeyLabel: string): void {
  const ids = new Set(sections.map(s => s.id));
  for (const section of sections) {
    for (const depId of section.dependsOn ?? []) {
      if (depId === section.id) {
        throw new SectionConfigError(`Journey '${journeyLabel}': section '${section.id}' depends on itself.`);
      }
      if (!ids.has(depId)) {
        throw new SectionConfigError(
          `Journey '${journeyLabel}': section '${section.id}' depends on unknown section '${depId}'.`
        );
      }
    }
  }
}
