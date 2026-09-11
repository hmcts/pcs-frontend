jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

jest.mock('@services/feeLookupService', () => ({
  FeeType: {
    counterClaimFlatFeeFEE0450: 2,
    counterClaimRanged: 3,
    counterClaim: 4,
  },
  getCounterClaimFeeType: jest.fn(),
  getFee: jest.fn(),
}));

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};
jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

const mockGetPbaAccounts = jest.fn();
jest.mock('@services/pcsApi/paymentService', () => ({
  paymentService: {
    getOutstandingCounterClaimPayment: jest.fn(),
    getPbaAccounts: mockGetPbaAccounts,
  },
}));

jest.mock('@routes/dashboard', () => ({
  getDashboardUrl: jest.fn((caseReference?: string) => (caseReference ? `/case/${caseReference}/dashboard` : null)),
}));

import { getTranslationFunction } from '../../../../main/modules/steps';
import { step } from '../../../../main/steps/respond-to-claim/counter-claim-application-fee-amount';

import type { CcdCounterClaim } from '@services/ccdCase.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';
import { getCounterClaimFeeType, getFee } from '@services/feeLookupService';
import { paymentService } from '@services/pcsApi/paymentService';

const makeValidatedCase = (counterClaim?: CcdCounterClaim, defendantResponses: Record<string, unknown> = {}) =>
  new CcdCaseModel({
    id: '',
    data: {
      possessionClaimResponse: {
        defendantResponses: {
          ...defendantResponses,
          ...(counterClaim !== undefined && { counterClaim }),
        },
      },
    },
  });

type CounterClaimApplicationFeeAmountStep = {
  resolveRedirectAfterPost: (req: {
    params?: { caseReference?: string };
    body?: Record<string, unknown>;
    session?: {
      user?: {
        roles?: string[];
      };
      payment?: {
        customerReference?: string;
        pbaAccount?: string;
        serviceRequestReference?: string;
        feeAmount?: number;
        counterClaimAmountInPence?: string;
        counterClaimType?: string;
      };
    };
  }) => Promise<string | undefined | void>;
  extendGetContent: (req: {
    params?: { caseReference?: string };
    query?: { payment?: string; from?: string };
    session?: {
      user?: {
        roles?: string[];
        accessToken?: string;
      };
      payment?: {
        serviceRequestReference?: string;
        feeAmount?: number;
        counterClaimAmountInPence?: string;
        counterClaimType?: string;
      };
      save?: (cb: (err?: Error) => void) => void;
    };
    res?: {
      locals?: {
        validatedCase?: CcdCaseModel;
        release12Enabled?: boolean;
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
    (getCounterClaimFeeType as jest.Mock).mockReturnValue(3);
    (getFee as jest.Mock).mockResolvedValue(377);
    (paymentService.getOutstandingCounterClaimPayment as jest.Mock).mockReset();
    mockGetPbaAccounts.mockResolvedValue({ pbaAccounts: ['PBA1234567'] });
  });

  it('returns i18n-formatted counterclaim amount and fee from fee register lookup', async () => {
    const content = await testedStep.extendGetContent({
      params: { caseReference: '123' },
      res: {
        locals: {
          validatedCase: makeValidatedCase({
            claimType: 'PAYMENT_OR_COMPENSATION',
            isClaimAmountKnown: 'YES',
            claimAmount: '64900',
          }),
        },
      },
      session: {
        payment: {
          serviceRequestReference: 'SR-1',
          counterClaimAmountInPence: '64900',
        },
      },
    });

    expect(getCounterClaimFeeType).toHaveBeenCalledWith('PAYMENT_OR_COMPENSATION', '64900');
    expect(getFee).toHaveBeenCalledWith(3, '64900');
    expect(paymentService.getOutstandingCounterClaimPayment).not.toHaveBeenCalled();
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
        backUrl: '/case/123/respond-to-claim/response-submitted-counter-claim-fee-payment-needed',
      })
    );
  });

  it('omits counterclaim amount row when session has no amount (AC03 / something else)', async () => {
    (getFee as jest.Mock).mockResolvedValue(154);

    const content = await testedStep.extendGetContent({
      params: { caseReference: '123' },
      res: {
        locals: {
          validatedCase: makeValidatedCase({
            claimType: 'SOMETHING_ELSE',
          }),
        },
      },
      session: {
        payment: {
          serviceRequestReference: 'SR-1',
          feeAmount: 35,
        },
      },
    });

    expect(content).toEqual(
      expect.objectContaining({
        formattedCounterClaimAmount: undefined,
        formattedCounterClaimFee: '£35',
        payNowDisabled: false,
        backUrl: '/case/123/respond-to-claim/response-submitted-counter-claim-fee-payment-needed',
      })
    );
  });

  it('falls back to CCD counterclaim amount when session snapshot is absent', async () => {
    (getFee as jest.Mock).mockResolvedValue(35);

    const content = await testedStep.extendGetContent({
      res: {
        locals: {
          validatedCase: makeValidatedCase({
            claimType: 'PAYMENT_OR_COMPENSATION',
            isClaimAmountKnown: 'YES',
            claimAmount: '250000',
          }),
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
        backUrl: '/case/123/respond-to-claim/response-submitted-counter-claim-fee-payment-needed',
      })
    );
  });

  it('uses submit-time session snapshot when CCD counterclaim draft is cleared after submit', async () => {
    const content = await testedStep.extendGetContent({
      params: { caseReference: '123' },
      res: {
        locals: {
          validatedCase: makeValidatedCase(undefined, {}),
        },
      },
      session: {
        payment: {
          serviceRequestReference: 'SR-1',
          feeAmount: 35,
          counterClaimAmountInPence: '250000',
          counterClaimType: 'PAYMENT_OR_COMPENSATION',
        },
      },
    });

    expect(getCounterClaimFeeType).not.toHaveBeenCalled();
    expect(getFee).not.toHaveBeenCalled();
    expect(content).toEqual(
      expect.objectContaining({
        formattedCounterClaimAmount: '£2500',
        formattedCounterClaimFee: '£35',
        payNowDisabled: false,
        backUrl: '/case/123/respond-to-claim/response-submitted-counter-claim-fee-payment-needed',
      })
    );
  });

  it('rehydrates payment session from outstanding counterclaim payment API', async () => {
    (paymentService.getOutstandingCounterClaimPayment as jest.Mock).mockResolvedValue({
      serviceRequestReference: 'SR-OUTSTANDING',
      feeAmount: '404.00',
      counterClaimAmountInPence: '250000',
      counterClaimType: 'PAYMENT_OR_COMPENSATION',
    });

    const session: {
      user: { accessToken: string };
      payment?: Record<string, unknown>;
      save: (cb: (err?: Error) => void) => void;
    } = {
      user: { accessToken: 'token-1' },
      save: cb => cb(),
    };

    const content = await testedStep.extendGetContent({
      params: { caseReference: '123' },
      query: { from: 'dashboard' },
      res: {
        locals: {
          release12Enabled: true,
          validatedCase: makeValidatedCase(undefined, {}),
        },
      },
      session,
    });

    expect(paymentService.getOutstandingCounterClaimPayment).toHaveBeenCalledWith('token-1', '123');
    expect(getFee).not.toHaveBeenCalled();
    expect(session.payment).toEqual(
      expect.objectContaining({
        serviceRequestReference: 'SR-OUTSTANDING',
        feeAmount: 404,
        counterClaimAmountInPence: '250000',
        counterClaimType: 'PAYMENT_OR_COMPENSATION',
      })
    );
    expect(content).toEqual(
      expect.objectContaining({
        formattedCounterClaimAmount: '£2500',
        formattedCounterClaimFee: '£404',
        payNowDisabled: false,
        backUrl: '/case/123/dashboard',
      })
    );
  });

  it('keeps pay disabled when outstanding payment lookup fails', async () => {
    (paymentService.getOutstandingCounterClaimPayment as jest.Mock).mockRejectedValue(new Error('not found'));

    const content = await testedStep.extendGetContent({
      params: { caseReference: '123' },
      query: { from: 'dashboard' },
      res: {
        locals: {
          release12Enabled: true,
          validatedCase: makeValidatedCase({
            claimType: 'PAYMENT_OR_COMPENSATION',
            isClaimAmountKnown: 'YES',
            claimAmount: '64900',
          }),
        },
      },
      session: {
        user: { accessToken: 'token-1' },
        save: cb => cb(),
      },
    });

    expect(content).toEqual(
      expect.objectContaining({
        payNowDisabled: true,
        backUrl: '/case/123/dashboard',
      })
    );
  });

  it('does not call outstanding payment API when release 1.2 is disabled', async () => {
    const content = await testedStep.extendGetContent({
      params: { caseReference: '123' },
      query: { from: 'dashboard' },
      res: {
        locals: {
          release12Enabled: false,
          validatedCase: makeValidatedCase({
            claimType: 'PAYMENT_OR_COMPENSATION',
            isClaimAmountKnown: 'YES',
            claimAmount: '64900',
          }),
        },
      },
      session: {
        user: { accessToken: 'token-1' },
        save: cb => cb(),
      },
    });

    expect(paymentService.getOutstandingCounterClaimPayment).not.toHaveBeenCalled();
    expect(content).toEqual(
      expect.objectContaining({
        payNowDisabled: true,
        backUrl: '/case/123/dashboard',
      })
    );
  });

  it('throws when counterclaim claim type is missing and fee cannot be resolved', async () => {
    await expect(
      testedStep.extendGetContent({
        session: {
          payment: {
            serviceRequestReference: 'SR-1',
          },
        },
      })
    ).rejects.toThrow('Counterclaim fee unavailable: missing claimType');
  });

  it('uses higher-tier fee lookup when counterclaim amount exceeds £5,000', async () => {
    (getCounterClaimFeeType as jest.Mock).mockReturnValue(4);
    (getFee as jest.Mock).mockResolvedValue(455);

    const content = await testedStep.extendGetContent({
      params: { caseReference: '123' },
      res: {
        locals: {
          validatedCase: makeValidatedCase({
            claimType: 'BOTH',
            isClaimAmountKnown: 'YES',
            claimAmount: '600000',
          }),
        },
      },
      session: {
        payment: {
          serviceRequestReference: 'SR-1',
          counterClaimAmountInPence: '600000',
        },
      },
    });

    expect(getCounterClaimFeeType).toHaveBeenCalledWith('BOTH', '600000');
    expect(getFee).toHaveBeenCalledWith(4, '600000');
    expect(content).toEqual(
      expect.objectContaining({
        formattedCounterClaimAmount: '£6000',
        formattedCounterClaimFee: '£455',
        payNowButton: 'Pay your counterclaim fee (£455)',
        backUrl: '/case/123/respond-to-claim/response-submitted-counter-claim-fee-payment-needed',
      })
    );
  });

  it('shows payment error when query indicates failed or pending payment', async () => {
    const content = await testedStep.extendGetContent({
      params: { caseReference: '123' },
      query: { payment: 'failed' },
      res: {
        locals: {
          validatedCase: makeValidatedCase({
            claimType: 'PAYMENT_OR_COMPENSATION',
            isClaimAmountKnown: 'YES',
            claimAmount: '250000',
          }),
        },
      },
      session: {
        payment: {
          serviceRequestReference: 'SR-1',
          feeAmount: 35,
        },
      },
    });

    expect(content.showPaymentError).toBe(true);
  });

  it('falls back to an empty PBA account list when account lookup fails', async () => {
    mockGetPbaAccounts.mockRejectedValue(new Error('PBA unavailable'));

    const content = await testedStep.extendGetContent({
      params: { caseReference: '123' },
      res: {
        locals: {
          validatedCase: makeValidatedCase({
            claimType: 'PAYMENT_OR_COMPENSATION',
            isClaimAmountKnown: 'YES',
            claimAmount: '250000',
          }),
        },
      },
      session: {
        user: {
          roles: ['caseworker-pcs-solicitor'],
          accessToken: 'token-1',
        },
        payment: {
          serviceRequestReference: 'SR-1',
          feeAmount: 35,
        },
      },
    });

    expect(content.pbaAccountItems).toEqual([{ value: '', text: 'labels.selectPba' }]);
    expect(mockLogger.error).toHaveBeenCalledWith('Unable to get PBA accounts for user', expect.any(Error));
  });

  it('redirects card payment POSTs to the card payment start route for the no-JS flow', async () => {
    await expect(
      testedStep.resolveRedirectAfterPost({
        params: { caseReference: '123' },
        body: { paymentOptions: 'card' },
        session: {
          user: {
            roles: ['caseworker-pcs-solicitor'],
          },
        },
      })
    ).resolves.toBe('/case/123/respond-to-claim/counter-claim-payment/start');
  });

  it('stores PBA payment details and redirects to the PBA payment start route', async () => {
    const req = {
      params: { caseReference: '123' },
      body: {
        paymentOptions: 'pba',
        'paymentOptions.customerReference': 'CUST-001',
        'paymentOptions.pbaAccount': 'PBA1234567',
      },
      session: {
        user: {
          roles: ['caseworker-pcs-solicitor'],
        },
        payment: {
          serviceRequestReference: 'SR-1',
          feeAmount: 377,
        },
      },
    };

    await expect(testedStep.resolveRedirectAfterPost(req)).resolves.toBe(
      '/case/123/respond-to-claim/counter-claim-pba-payment/start'
    );
    expect(req.session.payment).toEqual(
      expect.objectContaining({
        customerReference: 'CUST-001',
        pbaAccount: 'PBA1234567',
      })
    );
  });

  it('redirects back to the fee amount page when an unexpected payment option is posted', async () => {
    await expect(
      testedStep.resolveRedirectAfterPost({
        params: { caseReference: '123' },
        body: { paymentOptions: 'unexpected' },
        session: {
          user: {
            roles: ['caseworker-pcs-solicitor'],
          },
        },
      })
    ).resolves.toBe('/case/123/respond-to-claim/counter-claim-application-fee-amount');
  });
});
