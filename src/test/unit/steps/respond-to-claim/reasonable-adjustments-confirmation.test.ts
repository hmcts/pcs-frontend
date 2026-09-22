jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

jest.mock('@routes/dashboard', () => ({
  getDashboardUrl: jest.fn((caseReference?: string) => (caseReference ? `/case/${caseReference}/dashboard` : null)),
}));

import type { Request } from 'express';

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-confirmation';

describe('reasonable-adjustments-confirmation step', () => {
  const testedStep = step as unknown as {
    resolveRedirectAfterPost: (req: Request) => Promise<string | undefined | void>;
    resolveSaveForLaterRedirect: (req: Request) => Promise<string | undefined | void>;
  };

  const reqWith = (origin?: 'dashboard' | 'task-list'): Request =>
    ({
      params: {},
      session: origin ? { yourSupportReturnTo: origin } : {},
      res: { locals: { validatedCase: { id: '1234123412341234', data: {} } } },
    }) as unknown as Request;

  it('redirects "Save and continue" to the task list when Your Support was launched from there', async () => {
    await expect(testedStep.resolveRedirectAfterPost(reqWith('task-list'))).resolves.toBe(
      '/case/1234123412341234/respond-to-claim/task-list'
    );
  });

  it('redirects "Save and continue" to the dashboard when Your Support was launched from there', async () => {
    await expect(testedStep.resolveRedirectAfterPost(reqWith('dashboard'))).resolves.toBe(
      '/case/1234123412341234/dashboard'
    );
  });

  it('falls back to the task list when no origin was recorded before submission', async () => {
    await expect(testedStep.resolveRedirectAfterPost(reqWith())).resolves.toBe(
      '/case/1234123412341234/respond-to-claim/task-list'
    );
  });

  it('sends "Save for later" to the same place as "Save and continue"', async () => {
    await expect(testedStep.resolveSaveForLaterRedirect(reqWith('dashboard'))).resolves.toBe(
      '/case/1234123412341234/dashboard'
    );
    await expect(testedStep.resolveSaveForLaterRedirect(reqWith('task-list'))).resolves.toBe(
      '/case/1234123412341234/respond-to-claim/task-list'
    );
  });

  it('returns undefined when the case reference is unavailable (falls back to default routing)', async () => {
    const req = { params: {}, session: {}, res: { locals: {} } } as unknown as Request;
    await expect(testedStep.resolveRedirectAfterPost(req)).resolves.toBeUndefined();
  });
});
