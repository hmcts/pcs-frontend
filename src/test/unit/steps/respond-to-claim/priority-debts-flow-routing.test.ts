import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

describe('respond-to-claim priority-debts flow routing', () => {
  const previousStep = flowConfig.steps['priority-debts'].previousStep;
  const defaultNext = flowConfig.steps['priority-debts'].defaultNext;

  it('uses priority-debt-details as default next step', () => {
    expect(defaultNext).toBe('priority-debt-details');
  });

  it('uses regular-income as previous step when user is receiving UC as income (amount present)', async () => {
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
                    universalCreditAmount: '20000',
                    universalCreditFrequency: 'MONTHLY',
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

  it('uses have-you-applied-for-universal-credit as previous step when user answered NO to UC application', async () => {
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
                    hasAppliedForUniversalCredit: 'NO',
                    universalCreditAmount: null,
                    universalCreditFrequency: null,
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

  it('uses regular-income as previous step when UC income is selected, even if applied-for-UC answer is NO', async () => {
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
                    universalCreditAmount: '20000',
                    universalCreditFrequency: 'MONTHLY',
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

  it('prefers regular-income over have-you-applied-for-universal-credit when user receives UC as income (skipped UC application page)', async () => {
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
                    universalCreditAmount: '20000',
                    universalCreditFrequency: 'MONTHLY',
                    // Stale data from a previous path through the UC application page
                    hasAppliedForUniversalCredit: 'YES',
                    ucApplicationDate: '2024-01-15',
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

  it('uses have-you-applied-for-universal-credit as previous step when user answered YES to UC application', async () => {
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
                    hasAppliedForUniversalCredit: 'YES',
                    ucApplicationDate: '2024-01-15',
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
