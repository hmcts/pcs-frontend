import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

describe('respond-to-claim regular-income flow routing', () => {
  const routes = flowConfig.steps['what-regular-income-do-you-receive'].routes || [];
  const universalCreditRouteCondition = routes[0]?.condition;
  const noUniversalCreditRouteCondition = routes[1]?.condition;

  it('routes to priority-debts when universal credit is selected', async () => {
    if (!universalCreditRouteCondition) {
      throw new Error('expected universal credit route condition');
    }
    const result = await universalCreditRouteCondition(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      {},
      { regularIncome: ['incomeFromJobs', 'universalCredit'] }
    );

    expect(result).toBe(true);
    expect(routes[0]?.nextStep).toBe('priority-debts');
  });

  it('routes to universal-credit step when universal credit is not selected', async () => {
    if (!noUniversalCreditRouteCondition) {
      throw new Error('expected non-universal-credit route condition');
    }
    const result = await noUniversalCreditRouteCondition(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      {},
      { regularIncome: ['incomeFromJobs'] }
    );

    expect(result).toBe(true);
    expect(routes[1]?.nextStep).toBe('have-you-applied-for-universal-credit');
  });

  it('handles single-string checkbox payload values', async () => {
    if (!universalCreditRouteCondition || !noUniversalCreditRouteCondition) {
      throw new Error('expected regular-income route conditions');
    }
    const yesResult = await universalCreditRouteCondition(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      {},
      { regularIncome: 'universalCredit' }
    );
    const noResult = await noUniversalCreditRouteCondition(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      {},
      { regularIncome: 'incomeFromJobs' }
    );

    expect(yesResult).toBe(true);
    expect(noResult).toBe(true);
  });

  it('treats missing regularIncome as not selected when evaluating regular-income submit route', async () => {
    if (!universalCreditRouteCondition || !noUniversalCreditRouteCondition) {
      throw new Error('expected regular-income route conditions');
    }
    const req = {
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: { universalCredit: 'YES' },
                },
              },
            },
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    req.path = '/case/123/respond-to-claim/what-regular-income-do-you-receive';

    const toPriority = await universalCreditRouteCondition(req, {}, {});
    const toUcQuestion = await noUniversalCreditRouteCondition(req, {}, {});

    expect(toPriority).toBe(false);
    expect(toUcQuestion).toBe(true);
  });

  it('falls back to CCD when regularIncome is absent and universal credit is not indicated', async () => {
    if (!universalCreditRouteCondition || !noUniversalCreditRouteCondition) {
      throw new Error('expected regular-income route conditions');
    }
    const req = {
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: { universalCredit: 'NO' },
                },
              },
            },
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    req.path = '/some-other-route';

    const toPriority = await universalCreditRouteCondition(req, {}, {});
    const toUcQuestion = await noUniversalCreditRouteCondition(req, {}, {});

    expect(toPriority).toBe(false);
    expect(toUcQuestion).toBe(true);
  });

  it('prefers form regularIncome over CCD when both are present', async () => {
    if (!universalCreditRouteCondition) {
      throw new Error('expected universal credit route condition');
    }
    const req = {
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  householdCircumstances: { universalCredit: 'YES' },
                },
              },
            },
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = await universalCreditRouteCondition(req, {}, { regularIncome: ['incomeFromJobs'] });
    expect(result).toBe(false);
  });
});
