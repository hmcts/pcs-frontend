jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { getTranslationFunction } from '../../../../main/modules/steps';
import { step } from '../../../../main/steps/respond-to-claim/counter-claim-payment-successful';

type CounterClaimPaymentSuccessfulStep = {
  extendGetContent: (req: { session?: { payment?: { paymentReference?: string } } }) => Record<string, unknown>;
};

describe('counter-claim-payment-successful step', () => {
  const testedStep = step as unknown as CounterClaimPaymentSuccessfulStep;
  const tMock = jest.fn((key: string, options?: Record<string, unknown>) => {
    if (key === 'paymentReference') {
      return `Your payment reference number is: ${options?.paymentReference}`;
    }
    return key;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getTranslationFunction as jest.Mock).mockReturnValue(tMock);
  });

  it('returns interpolated payment reference line from session when present', () => {
    const content = testedStep.extendGetContent({
      session: {
        payment: {
          paymentReference: 'RC-123',
        },
      },
    });

    expect(tMock).toHaveBeenCalledWith('paymentReference', { paymentReference: 'RC-123' });
    expect(content.paymentReferenceLine).toBe('Your payment reference number is: RC-123');
  });

  it('returns undefined payment reference line when not present in session', () => {
    const content = testedStep.extendGetContent({
      session: {},
    });

    expect(content.paymentReferenceLine).toBeUndefined();
  });
});
