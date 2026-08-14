jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

const mockRedirectToPcq = jest.fn();
jest.mock('@services/pcq/redirectToPcq', () => ({
  redirectToPcq: mockRedirectToPcq,
}));

import type { Request } from 'express';

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-confirmation';

describe('reasonable-adjustments-confirmation step', () => {
  const testedStep = step as unknown as {
    beforeRedirect: (req: Request) => Promise<void>;
    resolveRedirectAfterPost: (req: Request) => Promise<string | undefined | void>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedirectToPcq.mockResolvedValue(true);
  });

  it('hands the citizen to PCQ on "Save and continue"', async () => {
    const req = { body: { action: 'continue' }, res: { locals: { validatedCase: { id: '123' } } } } as unknown as Request;

    await testedStep.beforeRedirect(req);

    expect(mockRedirectToPcq).toHaveBeenCalledWith(req);
  });

  it('does not hand off to PCQ when the citizen saves for later', async () => {
    // Saving for later leaves the journey entirely, so it must not burn a PcqId.
    const req = {
      body: { action: 'saveForLater' },
      res: { locals: { validatedCase: { id: '123' } } },
    } as unknown as Request;

    await testedStep.beforeRedirect(req);

    expect(mockRedirectToPcq).not.toHaveBeenCalled();
  });

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
