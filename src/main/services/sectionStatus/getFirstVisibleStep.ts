import type { Request } from 'express';

import type { JourneyFlowConfig, SectionConfig } from './types';

/**
 * Resolves the first step in a section that the user actually sees, applying
 * each step's `showCondition` against the current request. Returns `undefined`
 * if no step in the section is visible — typically a sign the section should
 * be NOT_APPLICABLE under the user's current case state.
 *
 * Used by:
 *   - the task-list page to build the section's clickable URL
 *   - the back-link engine hook to detect "first step of section" boundary
 */
export function getFirstVisibleStep(
  section: SectionConfig,
  flowConfig: JourneyFlowConfig,
  req: Request
): string | undefined {
  return section.steps.find(stepName => isStepVisible(stepName, flowConfig, req));
}

function isStepVisible(stepName: string, flowConfig: JourneyFlowConfig, req: Request): boolean {
  const stepConfig = flowConfig.steps[stepName];
  if (!stepConfig?.showCondition) {
    // No predicate = always visible. Matches the engine's existing convention.
    return true;
  }
  return stepConfig.showCondition(req);
}
