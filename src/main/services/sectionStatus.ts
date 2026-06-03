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
  AVAILABLE: 'govuk-tag govuk-tag--blue',
  IN_PROGRESS: 'govuk-tag govuk-tag--yellow',
  DONE: 'govuk-tag govuk-tag--green',
  NOT_AVAILABLE_YET: 'govuk-tag govuk-tag--grey',
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

  // Declaration order is topological — validateSectionConfig enforces it at startup.
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

  // CYA confirmation is the citizen's explicit "I'm done" — it overrides per-step scoring.
  // Edits revoke it via clearSectionCompletionOnEdit (buildDraftDefendantResponse), so the
  // section auto-drops back to whatever scoreAnsweredness reports.
  if (sectionHasCya(section) && userHasCompletedSectionViaCya(section, req)) {
    return 'DONE';
  }

  const questionSteps = visibleQuestionSteps(section, stepRegistry, flowConfig, req);
  if (questionSteps.length === 0) {
    // No countable question steps. If the section has a CYA the citizen still has to walk to,
    // status is gated purely on completedSections — handled above for DONE. Otherwise AVAILABLE.
    if (sectionHasCya(section)) {
      return 'AVAILABLE';
    }
    return 'NOT_APPLICABLE';
  }

  const raw = scoreAnsweredness(questionSteps, req);
  if (raw === 'DONE') {
    return sectionHasCya(section) ? 'IN_PROGRESS' : 'DONE';
  }
  return raw;
}

function userHasCompletedSectionViaCya(section: SectionConfig, req: Request): boolean {
  const completed = req.res?.locals.validatedCase?.possessionClaimResponse?.defendantResponses?.completedSections ?? [];
  return completed.includes(sectionIdToBackendEnum(section.id as RespondToClaimSectionId));
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

// Catches cycles too — any cycle has at least one back-reference.
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
