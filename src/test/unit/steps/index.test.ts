import type { Request } from 'express';

import {
  type JourneyConfig,
  findStep,
  journeyForSlug,
  shouldShowStep,
  validateJourneyRegistry,
} from '../../../main/steps/index';

import { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';

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

describe('journeyForSlug', () => {
  it('returns the journey for a known slug', () => {
    const journey = journeyForSlug('respond-to-claim');

    expect(journey).toBeDefined();
    expect(journey?.name).toBe('respondToClaim');
  });

  it('returns undefined for an unknown slug', () => {
    expect(journeyForSlug('not-a-real-journey')).toBeUndefined();
  });
});

describe('findStep', () => {
  it('returns the step for a known slug + step + default variant', () => {
    const step = findStep('respond-to-claim', 'counter-claim', 'default');

    expect(step).toBeDefined();
    expect(step?.name).toBe('counter-claim');
  });

  it('returns the step for the legalrep variant when present', () => {
    const step = findStep('respond-to-claim', 'counter-claim', 'legalrep');

    expect(step).toBeDefined();
    expect(step?.name).toBe('counter-claim');
  });

  it('returns undefined when slug is known but stepName is unknown', () => {
    expect(findStep('respond-to-claim', 'this-step-does-not-exist', 'default')).toBeUndefined();
  });

  it('returns undefined when slug is unknown', () => {
    expect(findStep('not-a-real-journey', 'counter-claim', 'default')).toBeUndefined();
  });

  it('carries documentStorage adapter from createFormStep config onto the StepDefinition', () => {
    const step = findStep('respond-to-claim', 'counter-claim', 'default');

    expect(step?.documentStorage).toBeDefined();
    expect(typeof step?.documentStorage?.read).toBe('function');
    expect(typeof step?.documentStorage?.readFresh).toBe('function');
    expect(typeof step?.documentStorage?.save).toBe('function');
  });
});

describe('validateJourneyRegistry', () => {
  function makeJourney(overrides: Partial<JourneyConfig> = {}): JourneyConfig {
    return {
      name: 'journeyA',
      slug: 'journey-a',
      default: {
        flowConfig: {} as JourneyFlowConfig,
        stepRegistry: {},
      },
      ...overrides,
    };
  }

  it('passes for the production registry', () => {
    expect(() =>
      validateJourneyRegistry({
        a: makeJourney({ slug: 'a' }),
        b: makeJourney({ name: 'journeyB', slug: 'b' }),
      })
    ).not.toThrow();
  });

  it('throws on duplicate slugs', () => {
    expect(() =>
      validateJourneyRegistry({
        a: makeJourney({ slug: 'dup' }),
        b: makeJourney({ name: 'journeyB', slug: 'dup' }),
      })
    ).toThrow(/Duplicate journey slug "dup"/);
  });
});
