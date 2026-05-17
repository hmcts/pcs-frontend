import type { Request } from 'express';

import type { JourneyFlowConfig, SectionConfig, SectionStatus, StepDefinition } from './types';

/**
 * Computes the status of one section from `validatedCase` and the user's request.
 * Pure function — no side effects, no persistence. Status is derived; the data IS
 * the state (per the design doc `cya.md`).
 *
 * Throws if the supplied flow config does not have `sections` — that's a sign the
 * caller is using the wrong flow (e.g., calling this on the linear legalrep
 * flow). Fail loud rather than silently produce wrong status.
 *
 * The `allStatuses` parameter is the partial map of statuses already computed
 * (used to resolve `dependsOn` gates). `getAllSectionStatuses` is the
 * orchestrator that computes them in topological order and feeds this in.
 */
export async function getSectionStatus(
  section: SectionConfig,
  flowConfig: JourneyFlowConfig,
  stepRegistry: Record<string, StepDefinition>,
  req: Request,
  allStatuses: ReadonlyMap<string, SectionStatus>
): Promise<SectionStatus> {
  if (!flowConfig.sections) {
    throw new Error(
      'getSectionStatus called with a flowConfig that has no sections. ' +
        'Section status is only meaningful for sectionalised journeys. ' +
        `Section id: ${section.id}, flow: ${flowConfig.journeyName ?? '(unnamed)'}.`
    );
  }

  // Gate 1 — applicability. Section vanishes entirely if not applicable.
  if (section.isApplicable && !(await section.isApplicable(req))) {
    return 'NOT_APPLICABLE';
  }

  // Gate 2 — dependsOn. Section is locked until all listed deps are DONE
  // (or NOT_APPLICABLE — non-applicable deps are treated as satisfied).
  if (section.dependsOn?.length) {
    const blocking = section.dependsOn.filter(depId => {
      const depStatus = allStatuses.get(depId);
      return depStatus !== 'DONE' && depStatus !== 'NOT_APPLICABLE';
    });
    if (blocking.length > 0) {
      return 'NOT_AVAILABLE_YET';
    }
  }

  // Gate 3 — escape-hatch predicate (rare).
  if (section.isAvailable && !section.isAvailable(req).available) {
    return 'NOT_AVAILABLE_YET';
  }

  // Count visible question steps and how many are answered.
  const questionSteps = section.steps
    .map(stepName => ({ stepName, step: stepRegistry[stepName] }))
    .filter((entry): entry is { stepName: string; step: StepDefinition } => entry.step !== undefined)
    .filter(({ step }) => (step.kind ?? 'question') === 'question')
    .filter(({ stepName }) => isStepVisible(stepName, flowConfig, req));

  // Section with no visible question steps (e.g., all hidden by showCondition,
  // or only interstitials + CYA) → nothing for the user to do here.
  if (questionSteps.length === 0) {
    return 'NOT_APPLICABLE';
  }

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

/**
 * Defensive wrapper around `step.isAnswered` — a buggy predicate must not crash
 * the task-list page. On exception we fall through to "not answered" so the
 * section stays in a safe IN_PROGRESS / AVAILABLE state rather than DONE.
 */
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
