jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/counter-claim';

describe('counter-claim step (placeholder)', () => {
  const testedStep = step as unknown as { stepName: string; fields: unknown[]; documentStorage?: unknown };

  it('has correct step name', () => {
    expect(testedStep.stepName).toBe('counter-claim');
  });

  it('has no fields (placeholder)', () => {
    expect(testedStep.fields).toEqual([]);
  });

  it('has no documentStorage (placeholder — upload removed)', () => {
    expect(testedStep.documentStorage).toBeUndefined();
  });
});
