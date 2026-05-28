import type { Request } from 'express';

import { legalrepFlowConfig } from '../../../../main/steps/respond-to-claim/legalrep.flow.config';
import { legalRepStepRegistry } from '../../../../main/steps/respond-to-claim/legalrep.stepRegistry';

import { getNextStep } from '@modules/steps/flow';

const CITIZEN_ONLY_STEPS = [
  'free-legal-advice',
  'other-considerations',
  'reasonable-adjustments-triage',
  'upload-document',
];

describe('respond-to-claim legalrep flow config', () => {
  it('every stepOrder entry resolves to a registered step', () => {
    const registered = new Set(Object.keys(legalRepStepRegistry));
    const unresolved = (legalrepFlowConfig.stepOrder ?? []).filter(slug => !registered.has(slug));
    expect(unresolved).toEqual([]);
  });

  it('has no duplicate stepOrder entries', () => {
    const order = legalrepFlowConfig.stepOrder ?? [];
    expect(new Set(order).size).toBe(order.length);
  });

  it('does not include citizen-only steps in stepOrder', () => {
    const order = new Set(legalrepFlowConfig.stepOrder ?? []);
    const leaks = CITIZEN_ONLY_STEPS.filter(slug => order.has(slug));
    expect(leaks).toEqual([]);
  });

  it('linear navigation from start-now skips free-legal-advice (citizen-only) and lands on select-defendant', async () => {
    const req = { res: { locals: { validatedCase: { data: {} } } } } as unknown as Request;
    const next = await getNextStep(req, 'start-now', legalrepFlowConfig, {});
    expect(next).not.toBe('free-legal-advice');
    expect(['select-defendant']).toContain(next);
  });
});
