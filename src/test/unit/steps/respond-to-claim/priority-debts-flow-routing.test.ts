import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

describe('respond-to-claim priority-debts flow routing', () => {
  const previousStep = flowConfig.steps['priority-debts'].previousStep;
  const routes = flowConfig.steps['priority-debts'].routes || [];
  const yesRouteCondition = routes[0]?.condition;
  const noRouteCondition = routes[1]?.condition;

  it('routes to priority-debt-details when yes selected', async () => {
    if (!yesRouteCondition) {
      throw new Error('expected yes route condition');
    }

    const result = await yesRouteCondition(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      {},
      { havePriorityDebts: 'yes' }
    );

    expect(result).toBe(true);
    expect(routes[0]?.nextStep).toBe('priority-debt-details');
  });

  it('routes to regular-expenses when no selected', async () => {
    if (!noRouteCondition) {
      throw new Error('expected no route condition');
    }

    const result = await noRouteCondition(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      {},
      { havePriorityDebts: 'no' }
    );

    expect(result).toBe(true);
    expect(routes[1]?.nextStep).toBe('what-other-regular-expenses-do-you-have');
  });

  it('uses regular-income as previous step when universal credit selected', async () => {
    if (!previousStep || typeof previousStep === 'string') {
      throw new Error('expected previousStep function');
    }

    const req = {
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: {
                    universalCredit: 'YES',
                  },
                },
              },
            },
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = await previousStep(req, {});
    expect(result).toBe('what-regular-income-do-you-receive');
  });

  it('uses have-you-applied-for-universal-credit as previous step when universal credit not selected', async () => {
    if (!previousStep || typeof previousStep === 'string') {
      throw new Error('expected previousStep function');
    }

    const req = {
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: {
                    universalCredit: 'NO',
                  },
                },
              },
            },
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = await previousStep(req, {});
    expect(result).toBe('have-you-applied-for-universal-credit');
  });
});
