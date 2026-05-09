import { legalrepFlowConfig } from '../../../../main/steps/respond-to-claim/legalrep.flow.config';
import { stepRegistry } from '../../../../main/steps/respond-to-claim/stepRegistry';

describe('respond-to-claim legalrep flow config', () => {
  it('every stepOrder entry resolves to a registered step', () => {
    const registered = new Set(Object.keys(stepRegistry));
    const unresolved = (legalrepFlowConfig.stepOrder ?? []).filter(slug => !registered.has(slug));
    expect(unresolved).toEqual([]);
  });

  it('has no duplicate stepOrder entries', () => {
    const order = legalrepFlowConfig.stepOrder ?? [];
    expect(new Set(order).size).toBe(order.length);
  });
});
