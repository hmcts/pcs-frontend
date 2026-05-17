import type { Request, Response } from 'express';

import { createSectionCyaStep } from '../../../../main/steps/respond-to-claim/section-cya/createSectionCyaStep';

jest.mock('@steps', () => ({
  getFlowConfigForJourney: () => undefined,
}));

const step = createSectionCyaStep({
  stepName: 'section-cya-test',
  cardTitleKey: 'cardTitle',
  stepDir: __dirname,
  buildRows: () => [],
});

const mkRes = (): Response => {
  const res = {} as Response;
  res.redirect = jest.fn() as unknown as Response['redirect'];
  res.render = jest.fn() as unknown as Response['render'];
  res.status = jest.fn().mockReturnValue(res) as unknown as Response['status'];
  return res;
};

const reqWith = (body: Record<string, unknown>, caseId = '1234123412341234'): Request =>
  ({
    body,
    res: { locals: { validatedCase: { id: caseId } } },
  }) as unknown as Request;

describe('createSectionCyaStep postController — hub-and-spoke redirect', () => {
  it('redirects continue submissions to the task-list hub for citizen RTC', async () => {
    const res = mkRes();
    await step.postController!.post(reqWith({ action: 'continue' }), res, jest.fn());
    expect(res.redirect).toHaveBeenCalledWith(303, '/case/1234123412341234/respond-to-claim/task-list');
  });

  it('redirects saveForLater submissions to the dashboard, not the hub', async () => {
    const res = mkRes();
    await step.postController!.post(reqWith({ action: 'saveForLater' }), res, jest.fn());
    const redirectMock = res.redirect as unknown as jest.Mock;
    const target = redirectMock.mock.calls[0][1] as string;
    expect(redirectMock).toHaveBeenCalledWith(303, expect.any(String));
    expect(target).not.toContain('/respond-to-claim/task-list');
  });
});
