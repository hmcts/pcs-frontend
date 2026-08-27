jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

const mockRedirectToPcq = jest.fn();
jest.mock('@services/pcq/redirectToPcq', () => ({
  redirectToPcq: mockRedirectToPcq,
}));

import type { Request } from 'express';

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-cancelled';

describe('reasonable-adjustments-cancelled step', () => {
  const testedStep = step as unknown as {
    extendGetContent: (req: unknown) => { taskListUrl: string };
  };

  it('builds the task-list continue url from the case reference', () => {
    const req = { res: { locals: { validatedCase: { id: '1234123412341234' } } } };
    expect(testedStep.extendGetContent(req)).toEqual({
      taskListUrl: '/case/1234123412341234/respond-to-claim/task-list',
    });
    beforeRedirect: (req: Request) => Promise<void>;
    resolveRedirectAfterPost: (req: Request) => Promise<string | undefined | void>;
  };

  const buildReq = (caseId?: string): Request =>
    ({
      body: { action: 'continue' },
      res: { locals: { validatedCase: caseId === undefined ? undefined : { id: caseId } } },
    }) as unknown as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedirectToPcq.mockResolvedValue(true);
  });

  it('hands the citizen to PCQ on continue', async () => {
    // Cancelling Your Support declines an adjustment request, not the equality questions.
    const req = buildReq('1234123412341234');

    await testedStep.beforeRedirect(req);

    expect(mockRedirectToPcq).toHaveBeenCalledWith(req);
  });

  it('redirects "Continue" to language-used with nav=1 (bypasses the mid-section access guard)', async () => {
    await expect(testedStep.resolveRedirectAfterPost(buildReq('1234123412341234'))).resolves.toBe(
      '/case/1234123412341234/respond-to-claim/language-used?nav=1'
    );
  });

  it('returns undefined when the case reference is unavailable (falls back to default routing)', async () => {
    await expect(testedStep.resolveRedirectAfterPost(buildReq())).resolves.toBeUndefined();
  });
});
