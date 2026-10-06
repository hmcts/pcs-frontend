import type { Request } from 'express';

import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

import { getPreviousStep } from '@modules/steps/flow';

describe('respond-to-claim citizen flow config', () => {
  it('is sectionalised, not linear — has no stepOrder (accidental addition would silently switch engine to flat dispatch)', () => {
    expect(flowConfig.stepOrder).toBeUndefined();
  });

  it('has sections defined and non-empty', () => {
    expect(flowConfig.sections).toBeDefined();
    expect(flowConfig.sections?.length).toBeGreaterThan(0);
  });

  it('has hubStepName set to task-list', () => {
    expect(flowConfig.hubStepName).toBe('task-list');
  });

  it('nonSectionStepOrder includes the hub step so section back-nav can resolve it', () => {
    // flow.ts:215 requires hubStepName to be in nonSectionStepOrder for the
    // first-step-of-section → hub back-link to fire.
    expect(flowConfig.nonSectionStepOrder).toBeDefined();
    expect(flowConfig.nonSectionStepOrder).toContain('task-list');
  });
});

describe('respond-to-claim language-used step', () => {
  const buildReq = (welshLanguageUsedEnabled: boolean) =>
    ({ res: { locals: { welshLanguageUsedEnabled, validatedCase: { data: {} } } } }) as unknown as Request;

  it('is shown only when welsh-language-used-enabled is on', () => {
    const showCondition = flowConfig.steps['language-used'].showCondition!;

    expect(showCondition(buildReq(true))).toBe(true);
    expect(showCondition(buildReq(false))).toBe(false);
  });

  it('is skipped by the end-of-journey CYA back link when the flag is off', async () => {
    await expect(getPreviousStep(buildReq(true), 'end-of-journey-cya', flowConfig)).resolves.toBe('language-used');
    await expect(getPreviousStep(buildReq(false), 'end-of-journey-cya', flowConfig)).resolves.not.toBe('language-used');
  });
});
