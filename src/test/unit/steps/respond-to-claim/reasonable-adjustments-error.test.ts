jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));
jest.mock('@routes/dashboard', () => ({
  getDashboardUrl: jest.fn((caseReference?: string) => (caseReference ? `/case/${caseReference}/dashboard` : null)),
}));

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-error';

describe('reasonable-adjustments-error step', () => {
  const testedStep = step as unknown as {
    extendGetContent: (req: unknown) => { triageUrl?: string };
  };

  const reqWith = (origin?: 'dashboard' | 'task-list') => ({
    session: origin ? { yourSupportReturnTo: { '1234123412341234': origin } } : {},
    res: { locals: { validatedCase: { id: '1234123412341234', data: {} } } },
  });

  it('builds the "Try again" url carrying the origin Your Support was launched from', () => {
    expect(testedStep.extendGetContent(reqWith('dashboard'))).toEqual({
      triageUrl: '/case/1234123412341234/respond-to-claim/reasonable-adjustments-triage?from=dashboard',
    });
    expect(testedStep.extendGetContent(reqWith('task-list'))).toEqual({
      triageUrl: '/case/1234123412341234/respond-to-claim/reasonable-adjustments-triage?from=task-list',
    });
  });

  it('falls back to the task list before submission when no origin was recorded', () => {
    expect(testedStep.extendGetContent(reqWith())).toEqual({
      triageUrl: '/case/1234123412341234/respond-to-claim/reasonable-adjustments-triage?from=task-list',
    });
  });
});
