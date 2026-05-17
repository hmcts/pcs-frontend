import type { Request } from 'express';

import type { JourneyFlowConfig, SectionConfig, SectionStatus, StepDefinition } from './types';

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
  if (isExplicitlyUnavailable(section, req)) {
    return 'NOT_AVAILABLE_YET';
  }

  const questionSteps = visibleQuestionSteps(section, stepRegistry, flowConfig, req);
  if (questionSteps.length === 0) {
    return 'NOT_APPLICABLE';
  }

  return scoreAnsweredness(questionSteps, req);
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

function isExplicitlyUnavailable(section: SectionConfig, req: Request): boolean {
  return Boolean(section.isAvailable && !section.isAvailable(req).available);
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
    .filter(({ step }) => (step.kind ?? 'question') === 'question')
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
function safeIsAnswered(step: StepDefinition, req: Request): boolean {
  if (!step.isAnswered) {
    return false;
  }
  try {
    return step.isAnswered(req);
  } catch {
    return false;
  }
}
