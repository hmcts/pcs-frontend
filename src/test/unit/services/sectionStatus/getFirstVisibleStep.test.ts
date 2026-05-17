import type { Request } from 'express';

import { getFirstVisibleStep } from '../../../../main/services/sectionStatus/getFirstVisibleStep';

import type { JourneyFlowConfig, SectionConfig } from '@modules/steps/stepFlow.interface';

const reqStub = {} as Request;

const section = (steps: string[]): SectionConfig => ({
  id: 'test',
  titleKey: 'test',
  steps,
});

describe('getFirstVisibleStep', () => {
  it('returns first step when no showConditions are defined', () => {
    const flow: JourneyFlowConfig = { steps: {} };
    expect(getFirstVisibleStep(section(['a', 'b', 'c']), flow, reqStub)).toBe('a');
  });

  it('skips steps whose showCondition returns false', () => {
    const flow: JourneyFlowConfig = {
      steps: {
        a: { showCondition: () => false },
        b: { showCondition: () => true },
      },
    };
    expect(getFirstVisibleStep(section(['a', 'b', 'c']), flow, reqStub)).toBe('b');
  });

  it('returns undefined when every step is hidden', () => {
    const flow: JourneyFlowConfig = {
      steps: {
        a: { showCondition: () => false },
        b: { showCondition: () => false },
      },
    };
    expect(getFirstVisibleStep(section(['a', 'b']), flow, reqStub)).toBeUndefined();
  });

  it('returns undefined for an empty section', () => {
    const flow: JourneyFlowConfig = { steps: {} };
    expect(getFirstVisibleStep(section([]), flow, reqStub)).toBeUndefined();
  });

  it('treats absent step config as visible (no showCondition = always visible)', () => {
    const flow: JourneyFlowConfig = { steps: {} };
    expect(getFirstVisibleStep(section(['unregistered-step']), flow, reqStub)).toBe('unregistered-step');
  });
});
