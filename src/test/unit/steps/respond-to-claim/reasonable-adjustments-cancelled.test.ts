jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-cancelled';

describe('reasonable-adjustments-cancelled step', () => {
  const testedStep = step as unknown as {
    extendGetContent: (req: unknown) => { languageUsedUrl: string };
  };

  it('builds the language-used continue url (with nav=1) from the case reference', () => {
    const req = { res: { locals: { validatedCase: { id: '1234123412341234' } } } };
    expect(testedStep.extendGetContent(req)).toEqual({
      languageUsedUrl: '/case/1234123412341234/respond-to-claim/language-used?nav=1',
    });
  });
});
