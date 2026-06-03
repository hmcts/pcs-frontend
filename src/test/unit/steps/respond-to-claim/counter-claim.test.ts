jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/counter-claim';

describe('counter-claim step', () => {
  const testedStep = step as unknown as {
    stepName: string;
    fields: { name: string; type: string }[];
    documentStorage?: unknown;
  };

  it('exposes the makeCounterClaim radio field', () => {
    expect(testedStep.fields).toHaveLength(1);
    expect(testedStep.fields[0]).toMatchObject({ name: 'makeCounterClaim', type: 'radio' });
  });

  it('has no documentStorage (upload removed)', () => {
    expect(testedStep.documentStorage).toBeUndefined();
  });
});
