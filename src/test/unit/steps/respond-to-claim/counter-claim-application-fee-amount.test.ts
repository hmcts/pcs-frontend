jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

jest.mock('../../../../main/services/feeLookupService', () => ({
  getCounterClaimFeeType: jest.fn(),
  getFee: jest.fn(),
}));

import { getTranslationFunction } from '../../../../main/modules/steps';
import { getCounterClaimFeeType, getFee } from '../../../../main/services/feeLookupService';
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
      const interpolatedFee = typeof options?.counterClaimFee === 'string' ? options.counterClaimFee : '';
      return `Pay your counterclaim fee (£${interpolatedFee})`;
    }
    return key;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getTranslationFunction as jest.Mock).mockReturnValue(tMock);
    (getCounterClaimFeeType as jest.Mock).mockReturnValue('counterClaimRanged');
    (getFee as jest.Mock).mockResolvedValue(377);
  });

  it('returns formatted counterclaim amount, fee and interpolated pay button text when claim amount is known', async () => {
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
    expect(content).toEqual(
      expect.objectContaining({
        counterClaimAmount: '649.00',
        counterClaimFee: '377.00',
        payNowButton: 'Pay your counterclaim fee (£377.00)',
        payNowUrl: '/case/123/respond-to-claim/counter-claim-payment/start',
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
