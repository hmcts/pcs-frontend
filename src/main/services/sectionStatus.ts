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

  // Walk in declaration order — validateSectionConfig asserts at startup that the
  // declaration order is topologically valid, so each section's dependsOn ids
  // already have their statuses computed by the time we reach it.
  const statuses = new Map<string, SectionStatus>();
  for (const section of flowConfig.sections) {
    const status = await getSectionStatus(section, flowConfig, stepRegistry, req, statuses);
    statuses.set(section.id, status);
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
  assertDeclarationOrderIsTopological(sections, journeyLabel);
}

// Declaration order must list each section after all of its dependsOn ids. This single
// invariant subsumes cycle detection (any cycle would force a back-reference) and lets
// getAllSectionStatuses skip a per-request topological sort.
function assertDeclarationOrderIsTopological(sections: readonly SectionConfig[], journeyLabel: string): void {
  const seen = new Set<string>();
  for (const section of sections) {
    for (const depId of section.dependsOn ?? []) {
      if (!seen.has(depId)) {
        throw new SectionConfigError(
          `Journey '${journeyLabel}': section '${section.id}' depends on '${depId}' which is not declared earlier — ` +
            'cyclic dependency or out-of-order declaration.'
        );
      }
    }
    seen.add(section.id);
  }
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
    return !!step.isAnswered(req);
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
