import type { Request } from 'express';

import { JourneyFlowConfig } from '../interfaces/stepFlow.interface';

export function shouldShowStep(req: Request, stepName: string, flowConfig: JourneyFlowConfig): boolean {
  const stepConfig = flowConfig.steps[stepName];
  if (!stepConfig || !stepConfig.showCondition) {
    return true;
  }

  return stepConfig.showCondition(req);
}
