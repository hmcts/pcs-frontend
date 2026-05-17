import type { Request } from 'express';

import type { JourneyFlowConfig, SectionConfig } from './types';

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
    return true;
  }
  return stepConfig.showCondition(req);
}
