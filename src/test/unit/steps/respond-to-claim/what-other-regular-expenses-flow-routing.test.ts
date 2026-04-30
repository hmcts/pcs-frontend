import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

describe('respond-to-claim what-other-regular-expenses-do-you-have back navigation', () => {
  const previousStep = flowConfig.steps['what-other-regular-expenses-do-you-have'].previousStep;

  const reqWithPriorityDebts = (priorityDebts: 'YES' | 'NO') =>
    ({
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: { priorityDebts },
                },
              },
            },
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

  if (!previousStep || typeof previousStep !== 'function') {
    throw new Error('expected previousStep function');
  }

  it('returns priority-debt-details when user has priority debts', async () => {
    const result = await previousStep(reqWithPriorityDebts('YES'), {});
    expect(result).toBe('priority-debt-details');
  });

  it('returns priority-debts when user has no priority debts', async () => {
    const result = await previousStep(reqWithPriorityDebts('NO'), {});
    expect(result).toBe('priority-debts');
  });
});
