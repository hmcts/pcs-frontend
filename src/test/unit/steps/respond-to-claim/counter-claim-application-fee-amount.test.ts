jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

jest.mock('../../../../main/services/feeLookupService', () => ({
  ...jest.requireActual('../../../../main/services/feeLookupService'),
  getCounterClaimFeeType: jest.fn(),
  getFee: jest.fn(),
}));

import { getTranslationFunction } from '../../../../main/modules/steps';
import { FeeType, getCounterClaimFeeType, getFee } from '../../../../main/services/feeLookupService';
import { step } from '../../../../main/steps/respond-to-claim/counter-claim-application-fee-amount';

type CounterClaimApplicationFeeAmountStep = {
  extendGetContent: (req: {
    params?: { caseReference?: string };
    query?: { payment?: string };
    session?: { payment?: { serviceRequestReference?: string } };
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
  }) => Promise<Record<string, string | undefined>>;
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
    (getCounterClaimFeeType as jest.Mock).mockReturnValue('counterClaimRanged');
    (getFee as jest.Mock).mockResolvedValue(377);
  });

  it('returns i18n-formatted counterclaim amount, fee and pay button text when claim amount is known', async () => {
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
                    claimAmount: '64900',
                  },
                },
              },
            },
          },
        },
      },
      params: { caseReference: '123' },
      session: { payment: { serviceRequestReference: 'SR-1' } },
    });

    expect(getCounterClaimFeeType).toHaveBeenCalledWith('PAYMENT_OR_COMPENSATION', '64900');
    expect(getFee).toHaveBeenCalledWith('counterClaimRanged', '64900');
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

  it('uses FEE0450 flat fee and empty amount for SOMETHING_ELSE claim type (AC03)', async () => {
    (getCounterClaimFeeType as jest.Mock).mockReturnValue(FeeType.counterClaimFlatFeeFEE0450);
    (getFee as jest.Mock).mockResolvedValue(154);

    const content = await testedStep.extendGetContent({
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                defendantResponses: {
                  counterClaim: {
                    claimType: 'SOMETHING_ELSE',
                  },
                },
              },
            },
          },
        },
      },
      params: { caseReference: '123' },
      session: { payment: { serviceRequestReference: 'SR-1' } },
    });

    expect(getCounterClaimFeeType).toHaveBeenCalledWith('SOMETHING_ELSE', undefined);
    expect(getFee).toHaveBeenCalledWith(FeeType.counterClaimFlatFeeFEE0450, undefined);
    expect(content).toEqual(
      expect.objectContaining({
        formattedCounterClaimAmount: undefined,
        formattedCounterClaimFee: '£154',
        payNowDisabled: false,
      })
    );
  });

  it('throws when claimType is missing', async () => {
    await expect(
      testedStep.extendGetContent({
        res: {
          locals: {
            validatedCase: {
              data: {
                possessionClaimResponse: {
                  defendantResponses: {
                    counterClaim: {},
                  },
                },
              },
            },
          },
        },
      })
    ).rejects.toThrow('Counterclaim application fee unavailable: missing claimType');
  });
});
