import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

describe('respond-to-claim priority-debts flow routing', () => {
  const previousStep = flowConfig.steps['priority-debts'].previousStep;
  const defaultNext = flowConfig.steps['priority-debts'].defaultNext;

  it('uses priority-debt-details as default next step', () => {
    expect(defaultNext).toBe('priority-debt-details');
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

  it('uses regular-income as previous step when universalCredit is YES, even if application date exists', async () => {
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
                    ucApplicationDate: '2026-01-15',
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
});
