import type { Request } from 'express';

import { getSectionStatus } from '../../../../main/services/sectionStatus';

import type { JourneyFlowConfig, SectionConfig, SectionStatus } from '@modules/steps/stepFlow.interface';
import type { StepDefinition } from '@modules/steps/stepFormData.interface';

const reqStub = {} as Request;

const stub = (overrides: Partial<StepDefinition> = {}): StepDefinition =>
  ({
    url: '/',
    name: 'stub',
    view: 'stub.njk',
    stepDir: '/stub',
    getController: () => (() => undefined) as never,
    isAnswered: () => false,
    ...overrides,
  }) as StepDefinition;

const flow = (steps: Record<string, { showCondition?: (req: Request) => boolean }> = {}): JourneyFlowConfig => ({
  sections: [],
  steps,
});

const section = (overrides: Partial<SectionConfig> = {}): SectionConfig => ({
  id: 's1',
  titleKey: 't',
  steps: [],
  ...overrides,
});

describe('getSectionStatus', () => {
  it('throws when called with a non-sectionalised flow config', async () => {
    const flowConfig: JourneyFlowConfig = { steps: {} }; // no sections — legalrep shape
    await expect(getSectionStatus(section(), flowConfig, {}, reqStub, new Map())).rejects.toThrow(
      /non-sectionalised flow/
    );
  });

  it('returns NOT_APPLICABLE when isApplicable resolves false', async () => {
    const sec = section({ isApplicable: async () => false });
    const status = await getSectionStatus(sec, flow(), {}, reqStub, new Map());
    expect(status).toBe('NOT_APPLICABLE');
  });

  it('returns NOT_AVAILABLE_YET when a dependency is not yet DONE', async () => {
    const sec = section({ dependsOn: ['other'] });
    const allStatuses: ReadonlyMap<string, SectionStatus> = new Map([['other', 'IN_PROGRESS']]);
    expect(await getSectionStatus(sec, flow(), {}, reqStub, allStatuses)).toBe('NOT_AVAILABLE_YET');
  });

  it('treats NOT_APPLICABLE dependencies as satisfied', async () => {
    const sec = section({ dependsOn: ['other'], steps: ['stepA'] });
    const registry = { stepA: stub({ isAnswered: () => false }) };
    const allStatuses: ReadonlyMap<string, SectionStatus> = new Map([['other', 'NOT_APPLICABLE']]);
    // Dep is non-applicable → counts as satisfied → status comes from answered count
    expect(await getSectionStatus(sec, flow(), registry, reqStub, allStatuses)).toBe('AVAILABLE');
  });

  it('returns AVAILABLE when no question steps are answered', async () => {
    const sec = section({ steps: ['stepA', 'stepB'] });
    const registry = {
      stepA: stub({ isAnswered: () => false }),
      stepB: stub({ isAnswered: () => false }),
    };
    expect(await getSectionStatus(sec, flow(), registry, reqStub, new Map())).toBe('AVAILABLE');
  });

  it('returns IN_PROGRESS when some question steps are answered', async () => {
    const sec = section({ steps: ['stepA', 'stepB'] });
    const registry = {
      stepA: stub({ isAnswered: () => true }),
      stepB: stub({ isAnswered: () => false }),
    };
    expect(await getSectionStatus(sec, flow(), registry, reqStub, new Map())).toBe('IN_PROGRESS');
  });

  it('returns DONE when every visible question step is answered', async () => {
    const sec = section({ steps: ['stepA', 'stepB'] });
    const registry = {
      stepA: stub({ isAnswered: () => true }),
      stepB: stub({ isAnswered: () => true }),
    };
    expect(await getSectionStatus(sec, flow(), registry, reqStub, new Map())).toBe('DONE');
  });

  it('ignores steps without isAnswered (interstitials and CYAs) when counting answers', async () => {
    const sec = section({ steps: ['intro', 'stepA', 'cya'] });
    const registry = {
      intro: { ...stub(), isAnswered: undefined },
      stepA: stub({ isAnswered: () => true }),
      cya: { ...stub(), isAnswered: undefined },
    };
    // Only stepA has isAnswered → only stepA counts → DONE.
    expect(await getSectionStatus(sec, flow(), registry, reqStub, new Map())).toBe('DONE');
  });

  it('ignores hidden steps when counting answers', async () => {
    const sec = section({ steps: ['hidden', 'stepA'] });
    const registry = {
      hidden: stub({ isAnswered: () => false }),
      stepA: stub({ isAnswered: () => true }),
    };
    const flowConfig = flow({
      hidden: { showCondition: () => false },
      stepA: { showCondition: () => true },
    });
    // hidden is not visible → only stepA counts → DONE.
    expect(await getSectionStatus(sec, flowConfig, registry, reqStub, new Map())).toBe('DONE');
  });

  it('returns NOT_APPLICABLE when all question steps are hidden', async () => {
    const sec = section({ steps: ['hidden1', 'hidden2'] });
    const registry = {
      hidden1: stub({ isAnswered: () => true }),
      hidden2: stub({ isAnswered: () => true }),
    };
    const flowConfig = flow({
      hidden1: { showCondition: () => false },
      hidden2: { showCondition: () => false },
    });
    expect(await getSectionStatus(sec, flowConfig, registry, reqStub, new Map())).toBe('NOT_APPLICABLE');
  });

  it('falls through to "not answered" when isAnswered throws (defensive)', async () => {
    const sec = section({ steps: ['stepA', 'stepB'] });
    const registry = {
      stepA: stub({
        isAnswered: () => {
          throw new Error('boom');
        },
      }),
      stepB: stub({ isAnswered: () => true }),
    };
    // stepA crashes → treated as not answered. stepB is answered → IN_PROGRESS.
    expect(await getSectionStatus(sec, flow(), registry, reqStub, new Map())).toBe('IN_PROGRESS');
  });

  it('treats a section with no question steps (no isAnswered predicates) as NOT_APPLICABLE', async () => {
    const sec = section({ steps: ['stepA'] });
    const registry = { stepA: { ...stub(), isAnswered: undefined } };
    expect(await getSectionStatus(sec, flow(), registry, reqStub, new Map())).toBe('NOT_APPLICABLE');
  });

  it('skips steps not present in the registry (graceful)', async () => {
    const sec = section({ steps: ['ghost', 'stepA'] });
    const registry = { stepA: stub({ isAnswered: () => true }) };
    // ghost ignored, stepA answered → DONE.
    expect(await getSectionStatus(sec, flow(), registry, reqStub, new Map())).toBe('DONE');
  });

  // The override fires only for sections whose steps include a CYA — that is, a
  // step whose name starts with `check-your-answers-`. A section without a CYA
  // (e.g. `checkYourAnswersAndSubmit`, whose own CYA is the global one) passes
  // raw status through unchanged.
  describe('confirmedSections override', () => {
    const reqWithConfirmed = (ids: string[]): Request =>
      ({
        res: {
          locals: {
            validatedCase: { possessionClaimResponse: { defendantResponses: { confirmedSections: ids } } },
          },
        },
      }) as unknown as Request;

    const sectionWithCya = (id: string, lastStepName: string) =>
      section({
        id,
        steps: ['stepA', lastStepName],
      });

    it('flips DONE → IN_PROGRESS when section has CYA but is not in confirmedSections', async () => {
      const sec = sectionWithCya('personalDetails', 'check-your-answers-personal-details');
      const registry = {
        stepA: stub({ isAnswered: () => true }),
        'check-your-answers-personal-details': { ...stub(), isAnswered: undefined },
      };
      const status = await getSectionStatus(sec, flow(), registry, reqWithConfirmed([]), new Map());
      expect(status).toBe('IN_PROGRESS');
    });

    it('keeps DONE when section is in confirmedSections', async () => {
      const sec = sectionWithCya('personalDetails', 'check-your-answers-personal-details');
      const registry = {
        stepA: stub({ isAnswered: () => true }),
        'check-your-answers-personal-details': { ...stub(), isAnswered: undefined },
      };
      const status = await getSectionStatus(sec, flow(), registry, reqWithConfirmed(['PERSONAL_DETAILS']), new Map());
      expect(status).toBe('DONE');
    });

    it('passes IN_PROGRESS through unchanged regardless of confirmedSections (raw wins)', async () => {
      const sec = section({
        id: 'personalDetails',
        steps: ['stepA', 'stepB', 'check-your-answers-personal-details'],
      });
      const registry = {
        stepA: stub({ isAnswered: () => true }),
        stepB: stub({ isAnswered: () => false }),
        'check-your-answers-personal-details': { ...stub(), isAnswered: undefined },
      };
      // Stale flag present (somehow) — raw status says IN_PROGRESS → that wins.
      const status = await getSectionStatus(sec, flow(), registry, reqWithConfirmed(['PERSONAL_DETAILS']), new Map());
      expect(status).toBe('IN_PROGRESS');
    });

    it('does not apply the override for sections without a CYA (e.g. checkYourAnswersAndSubmit)', async () => {
      // checkYourAnswersAndSubmit has steps like ['equality-and-diversity-start', …, 'check-your-answers']
      // — none start with the CYA prefix, so sectionHasCya is false and raw status passes through.
      const sec = section({
        id: 'checkYourAnswersAndSubmit',
        steps: ['equality-and-diversity-start', 'check-your-answers'],
      });
      const registry = {
        'equality-and-diversity-start': stub({ isAnswered: () => true }),
        'check-your-answers': { ...stub(), isAnswered: undefined },
      };
      const status = await getSectionStatus(sec, flow(), registry, reqWithConfirmed([]), new Map());
      expect(status).toBe('DONE');
    });
  });
});
