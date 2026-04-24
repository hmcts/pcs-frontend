import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

describe('respond-to-claim what-other-regular-expenses-do-you-have back navigation', () => {
  const previousStep = flowConfig.steps['what-other-regular-expenses-do-you-have'].previousStep;

  it('always returns priority-debt-details as previous step', () => {
    expect(previousStep).toBe('priority-debt-details');
  });
});
