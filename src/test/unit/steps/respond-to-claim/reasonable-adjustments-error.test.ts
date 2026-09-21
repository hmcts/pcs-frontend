jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-error';

describe('reasonable-adjustments-error step', () => {
  const testedStep = step as unknown as {
    extendGetContent: (req: unknown) => { triageUrl: string };
  };

  it('builds the triage url for the "Try again" button from the case reference', () => {
    const req = { res: { locals: { validatedCase: { id: '1234123412341234' } } } };
    expect(testedStep.extendGetContent(req)).toEqual({
      triageUrl: '/case/1234123412341234/respond-to-claim/reasonable-adjustments-triage',
    });
  });
});
