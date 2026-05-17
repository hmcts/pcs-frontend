import type { Request } from 'express';

import { legalrepFlowConfig } from '../../../../main/steps/respond-to-claim/legalrep.flow.config';
import { stepRegistry } from '../../../../main/steps/respond-to-claim/stepRegistry';

import { getNextStep } from '@modules/steps/flow';

const CITIZEN_ONLY_STEPS = [
  'free-legal-advice',
  'other-considerations',
  'upload-document',
  'support-needs',
  // task-list + per-section CYAs are citizen-hub-only — legal rep gets the single
  // whole-claim CYA at check-your-answers, not these per-section summaries.
  'task-list',
  'check-your-answers-start-now-and-details',
  'check-your-answers-personal-details',
  'check-your-answers-your-response',
  'check-your-answers-payments-and-agreements',
  'check-your-answers-your-circumstances',
  'check-your-answers-income-and-expenses',
  'check-your-answers-documents',
];

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

  it('is a linear stepOrder journey, not sectional — does not inherit citizen sections', () => {
    expect(legalrepFlowConfig.sections).toBeUndefined();
    expect(legalrepFlowConfig.nonSectionStepOrder).toBeUndefined();
  });

  it('does not include citizen-only steps in stepOrder', () => {
    const order = new Set(legalrepFlowConfig.stepOrder ?? []);
    const leaks = CITIZEN_ONLY_STEPS.filter(slug => order.has(slug));
    expect(leaks).toEqual([]);
  });

  it('linear navigation from start-now skips free-legal-advice (citizen-only) and lands on defendant-name pair', async () => {
    const req = { res: { locals: { validatedCase: { data: {} } } } } as unknown as Request;
    const next = await getNextStep(req, 'start-now', legalrepFlowConfig, {});
    expect(next).not.toBe('free-legal-advice');
    expect(['defendant-name-confirmation', 'defendant-name-capture']).toContain(next);
  });
});
