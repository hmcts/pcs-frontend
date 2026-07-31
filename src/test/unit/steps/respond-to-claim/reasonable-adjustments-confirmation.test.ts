jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import type { Request } from 'express';

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-confirmation';

describe('reasonable-adjustments-confirmation step', () => {
  const testedStep = step as unknown as {
    resolveRedirectAfterPost: (req: Request) => Promise<string | undefined | void>;
  };

  it('redirects "Save and continue" to language-used with nav=1 (bypasses the mid-section access guard)', async () => {
    const req = { res: { locals: { validatedCase: { id: '1234123412341234' } } } } as unknown as Request;
    await expect(testedStep.resolveRedirectAfterPost(req)).resolves.toBe(
      '/case/1234123412341234/respond-to-claim/language-used?nav=1'
    );
  });

  it('returns undefined when the case reference is unavailable (falls back to default routing)', async () => {
    const req = { res: { locals: {} } } as unknown as Request;
    await expect(testedStep.resolveRedirectAfterPost(req)).resolves.toBeUndefined();
  });
});
