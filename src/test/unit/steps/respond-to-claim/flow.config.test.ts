import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

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
