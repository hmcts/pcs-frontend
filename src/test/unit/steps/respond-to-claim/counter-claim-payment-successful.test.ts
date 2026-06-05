jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

import { step } from '../../../../main/steps/respond-to-claim/counter-claim-payment-successful';

type CounterClaimPaymentSuccessfulStep = {
  extendGetContent: (req: { session?: { payment?: { paymentReference?: string } } }) => Record<string, unknown>;
};

describe('counter-claim-payment-successful step', () => {
  const testedStep = step as unknown as CounterClaimPaymentSuccessfulStep;

  it('returns payment reference from session when present', () => {
    const content = testedStep.extendGetContent({
      session: {
        payment: {
          paymentReference: 'RC-123',
        },
      },
    });

    expect(content.paymentReference).toBe('RC-123');
  });

  it('returns undefined payment reference when not present in session', () => {
    const content = testedStep.extendGetContent({
      session: {},
    });

    expect(content.paymentReference).toBeUndefined();
  });
});
