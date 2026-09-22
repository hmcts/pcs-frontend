jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

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
  });
});
