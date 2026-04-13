import type { Request } from 'express';

import { JourneyFlowConfig } from '../../../main/interfaces/stepFlow.interface';
import { shouldShowStep } from '../../../main/steps/showConditionService';

describe('shouldShowStep', () => {
  const req: Request = {} as Request;
  const testStepName = 'test-step1';
  const flowConfig: JourneyFlowConfig = {} as JourneyFlowConfig;

  beforeEach(() => {
    flowConfig.steps = {};
  });

  it('returns true when no step config exists', () => {
    const shouldShow = shouldShowStep(req, testStepName, flowConfig);

    expect(shouldShow).toEqual(true);
  });

  it('returns true when step config has no show condition', () => {
    flowConfig.steps[testStepName] = {};

    const shouldShow = shouldShowStep(req, testStepName, flowConfig);

    expect(shouldShow).toEqual(true);
  });

  it('returns true when step config show condition is true', () => {
    flowConfig.steps[testStepName] = {
      showCondition: () => true,
    };

    const shouldShow = shouldShowStep(req, testStepName, flowConfig);

    expect(shouldShow).toEqual(true);
  });

  it('returns false when step config show condition is false', () => {
    flowConfig.steps[testStepName] = {
      showCondition: () => false,
    };

    const shouldShow = shouldShowStep(req, testStepName, flowConfig);

    expect(shouldShow).toEqual(false);
  });
});
