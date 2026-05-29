import type { Request } from 'express';

import { clearPaymentSessionState, setPaymentSessionState } from '@services/paymentSessionService';

describe('paymentSessionService', () => {
  it('stores payment session state including payment reference', () => {
    const req = {
      session: {},
    } as unknown as Request;

    setPaymentSessionState(req, {
      caseReference: '1234567890123456',
      serviceRequestReference: 'SR-123',
      paymentReference: 'RC-123',
      successRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-successful',
      failureRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-failed',
      pendingRedirectUrl: '/payment/return',
    });

    expect(req.session.payment).toEqual({
      caseReference: '1234567890123456',
      serviceRequestReference: 'SR-123',
      paymentReference: 'RC-123',
      successRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-successful',
      failureRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-failed',
      pendingRedirectUrl: '/payment/return',
    });
  });

  it('clears payment session state', () => {
    const req = {
      session: {
        payment: {
          paymentReference: 'RC-123',
        },
      },
    } as unknown as Request;

    clearPaymentSessionState(req);

    expect(req.session.payment).toBeUndefined();
  });
});
