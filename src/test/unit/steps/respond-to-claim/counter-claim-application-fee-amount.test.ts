jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { getTranslationFunction } from '../../../../main/modules/steps';
import { step } from '../../../../main/steps/respond-to-claim/counter-claim-application-fee-amount';

type CounterClaimApplicationFeeAmountStep = {
  extendGetContent: (req: {
    params?: { caseReference?: string };
    query?: { payment?: string };
    session?: {
      payment?: {
        serviceRequestReference?: string;
        feeAmount?: number;
        counterClaimAmountInPence?: string;
      };
    };
    res?: {
      locals?: {
        validatedCase?: {
          data?: {
            possessionClaimResponse?: {
              defendantResponses?: {
                counterClaim?: {
                  claimType?: string;
                  isClaimAmountKnown?: string;
                  claimAmount?: string;
                  estimatedMaxClaimAmount?: string;
                };
              };
            };
          };
        };
      };
    };
  }) => Promise<Record<string, string | boolean | undefined>>;
};

describe('respond-to-claim counter-claim-application-fee-amount step', () => {
  const testedStep = step as unknown as CounterClaimApplicationFeeAmountStep;
  const tMock = jest.fn((key: string, options?: Record<string, unknown>) => {
    if (key === 'payNowButton') {
      return `Pay your counterclaim fee (£${options?.counterClaimFee})`;
    }
    if (key === 'counterClaimAmountDisplay') {
      return `£${options?.counterClaimAmount}`;
    }
    if (key === 'counterClaimFeeDisplay') {
      return `£${options?.counterClaimFee}`;
    }
    return key;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getTranslationFunction as jest.Mock).mockReturnValue(tMock);
  });

  it('returns i18n-formatted counterclaim amount and fee from payment session (Scott-style)', async () => {
    const content = await testedStep.extendGetContent({
      params: { caseReference: '123' },
      session: {
        payment: {
          serviceRequestReference: 'SR-1',
          feeAmount: 377,
          counterClaimAmountInPence: '64900',
        },
      },
    });

    expect(tMock).toHaveBeenCalledWith('counterClaimAmountDisplay', { counterClaimAmount: 649 });
    expect(tMock).toHaveBeenCalledWith('counterClaimFeeDisplay', { counterClaimFee: 377 });
    expect(tMock).toHaveBeenCalledWith('payNowButton', { counterClaimFee: 377 });
    expect(content).toEqual(
      expect.objectContaining({
        formattedCounterClaimAmount: '£649',
        formattedCounterClaimFee: '£377',
        payNowButton: 'Pay your counterclaim fee (£377)',
        payNowUrl: '/case/123/respond-to-claim/counter-claim-payment/start',
        payNowDisabled: false,
      })
    );
  });

  it('omits counterclaim amount row when session has no amount (AC03 / something else)', async () => {
    const content = await testedStep.extendGetContent({
      params: { caseReference: '123' },
      session: {
        payment: {
          serviceRequestReference: 'SR-1',
          feeAmount: 154,
        },
      },
    });

    expect(content).toEqual(
      expect.objectContaining({
        formattedCounterClaimAmount: undefined,
        formattedCounterClaimFee: '£154',
        payNowDisabled: false,
      })
    );
  });

  it('falls back to CCD counterclaim amount when session snapshot is absent', async () => {
    const content = await testedStep.extendGetContent({
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  counterClaim: {
                    claimType: 'PAYMENT_OR_COMPENSATION',
                    isClaimAmountKnown: 'YES',
                    claimAmount: '250000',
                  },
                },
              },
            },
          },
        },
      },
      params: { caseReference: '123' },
      session: {
        payment: {
          serviceRequestReference: 'SR-1',
          feeAmount: 35,
        },
      },
    });

    expect(tMock).toHaveBeenCalledWith('counterClaimAmountDisplay', { counterClaimAmount: 2500 });
    expect(content).toEqual(
      expect.objectContaining({
        formattedCounterClaimAmount: '£2500',
        formattedCounterClaimFee: '£35',
      })
    );
  });

  it('throws when fee amount is missing from payment session', async () => {
    await expect(
      testedStep.extendGetContent({
        session: {
          payment: {
            serviceRequestReference: 'SR-1',
          },
        },
      })
    ).rejects.toMatchObject({ message: 'No fee amount found in payment session', status: 500 });
  });

  it('shows payment error when query indicates failed or pending payment', async () => {
    const content = await testedStep.extendGetContent({
      params: { caseReference: '123' },
      query: { payment: 'failed' },
      session: {
        payment: {
          serviceRequestReference: 'SR-1',
          feeAmount: 35,
        },
      },
    });

    expect(content.showPaymentError).toBe(true);
  });
});
