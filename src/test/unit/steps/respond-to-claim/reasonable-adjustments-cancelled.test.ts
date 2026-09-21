jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

jest.mock('@routes/dashboard', () => ({
  getDashboardUrl: jest.fn((caseReference?: string) => (caseReference ? `/case/${caseReference}/dashboard` : null)),
}));

import { step } from '../../../../main/steps/respond-to-claim/reasonable-adjustments-cancelled';

describe('reasonable-adjustments-cancelled step', () => {
  const testedStep = step as unknown as {
    extendGetContent: (req: unknown) => { continueUrl?: string };
  };

  const reqWith = (origin?: 'dashboard' | 'task-list', submitted = false) => ({
    params: {},
    session: origin ? { yourSupportReturnTo: origin } : {},
    res: {
      locals: {
        validatedCase: {
          id: '1234123412341234',
          data: submitted ? { possessionClaimResponse: { defendantResponses: { status: 'SUBMITTED' } } } : {},
        },
      },
    },
  });

  it('continues to the task list when Your Support was launched from the task list', () => {
    expect(testedStep.extendGetContent(reqWith('task-list'))).toEqual({
      continueUrl: '/case/1234123412341234/respond-to-claim/task-list',
    });
  });

  it('continues to the dashboard when Your Support was launched from the dashboard', () => {
    expect(testedStep.extendGetContent(reqWith('dashboard'))).toEqual({
      continueUrl: '/case/1234123412341234/dashboard',
    });
  });

  it('falls back on the response status when no origin was recorded', () => {
    expect(testedStep.extendGetContent(reqWith())).toEqual({
      continueUrl: '/case/1234123412341234/respond-to-claim/task-list',
    });
    expect(testedStep.extendGetContent(reqWith(undefined, true))).toEqual({
      continueUrl: '/case/1234123412341234/dashboard',
    });
  });
});
