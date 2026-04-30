import type { Request } from 'express';

import {
  type JourneyConfig,
  findStep,
  journeyForSlug,
  shouldShowStep,
  validateJourneyRegistry,
} from '../../../main/steps/index';

import { JourneyFlowConfig } from '@modules/steps/stepFlow.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

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

  it('preserves uploadDocsPath from createFormStep config onto the StepDefinition', () => {
    const step = findStep('respond-to-claim', 'counter-claim', 'default');

    expect(step?.uploadDocsPath).toEqual(['possessionClaimResponse', 'defendantResponses', 'counterClaimDocuments']);
  });
});

describe('validateJourneyRegistry', () => {
  function makeStep(overrides: Partial<StepDefinition> = {}): StepDefinition {
    return {
      url: '/x',
      name: 'x',
      view: 'x.njk',
      stepDir: '/tmp',
      getController: jest.fn(),
      ...overrides,
    } as StepDefinition;
  }

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

  it('throws when an upload step exists in a journey without draftEvent', () => {
    expect(() =>
      validateJourneyRegistry({
        a: makeJourney({
          slug: 'a',
          default: {
            flowConfig: {} as JourneyFlowConfig,
            stepRegistry: {
              upload: makeStep({ name: 'upload', uploadDocsPath: ['x', 'y'] }),
            },
          },
        }),
      })
    ).toThrow(/Upload step "upload" defined for journey "a" but journey has no draftEvent/);
  });

  it('passes when upload step is paired with draftEvent', () => {
    expect(() =>
      validateJourneyRegistry({
        a: makeJourney({
          slug: 'a',
          draftEvent: { id: 'someEvent', pageId: 'somePage' },
          default: {
            flowConfig: {} as JourneyFlowConfig,
            stepRegistry: {
              upload: makeStep({ name: 'upload', uploadDocsPath: ['x', 'y'] }),
            },
          },
        }),
      })
    ).not.toThrow();
  });

  it('also enforces the upload-step invariant on the legalrep variant', () => {
    expect(() =>
      validateJourneyRegistry({
        a: makeJourney({
          slug: 'a',
          default: {
            flowConfig: {} as JourneyFlowConfig,
            stepRegistry: {},
          },
          legalrep: {
            flowConfig: {} as JourneyFlowConfig,
            stepRegistry: {
              upload: makeStep({ name: 'upload', uploadDocsPath: ['x'] }),
            },
          },
        }),
      })
    ).toThrow(/Upload step "upload" defined for journey "a" but journey has no draftEvent/);
  });
});
