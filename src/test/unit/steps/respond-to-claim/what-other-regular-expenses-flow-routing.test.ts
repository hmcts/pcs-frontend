import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

describe('respond-to-claim what-other-regular-expenses-do-you-have back navigation', () => {
  const previousStep = flowConfig.steps['what-other-regular-expenses-do-you-have'].previousStep;

  it('returns priority-debt-details when priority debts answer was yes', async () => {
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
                    priorityDebts: 'YES',
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
    expect(result).toBe('priority-debt-details');
  });

  it('returns priority-debts when priority debts answer was no', async () => {
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
                    priorityDebts: 'NO',
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
    expect(result).toBe('priority-debts');
  });

  it('returns priority-debts when priority debts is not set', async () => {
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
                  householdCircumstances: {},
                },
              },
            },
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = await previousStep(req, {});
    expect(result).toBe('priority-debts');
  });
});
