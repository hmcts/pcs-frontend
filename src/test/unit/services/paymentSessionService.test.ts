import type { Request } from 'express';

import {
  clearPaymentReferenceOnly,
  clearPaymentSessionState,
  persistPaymentSessionState,
  retainPaymentReferenceOnly,
  setPaymentSessionState,
} from '@services/paymentSessionService';

describe('paymentSessionService', () => {
  const createReq = (session: Record<string, unknown> = {}) => {
    const req = {
      session,
    } as unknown as Request;

    req.session.save = jest.fn(callback => {
      callback?.(undefined);
      return req.session;
    });

    return req;
  };

  it('stores payment session state when payment has started', () => {
    const req = createReq();

    setPaymentSessionState(req, {
      caseReference: '1234567890123456',
      serviceRequestReference: 'SR-123',
      feeAmount: 10.99,
      paymentReference: 'RC-123',
      successRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-successful',
      failureRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-failed',
      pendingRedirectUrl: '/payment/return',
    });

    expect(req.session.payment).toEqual({
      caseReference: '1234567890123456',
      serviceRequestReference: 'SR-123',
      feeAmount: 10.99,
      paymentReference: 'RC-123',
      successRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-successful',
      failureRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-failed',
      pendingRedirectUrl: '/payment/return',
    });
  });

  it('stores payment session state before payment starts', () => {
    const req = createReq();

    setPaymentSessionState(req, {
      caseReference: '1234567890123456',
      serviceRequestReference: 'SR-123',
      feeAmount: 10.99,
    });

    expect(req.session.payment).toEqual({
      caseReference: '1234567890123456',
      serviceRequestReference: 'SR-123',
      feeAmount: 10.99,
    });
  });

  it('persists payment session state to the session store', async () => {
    const req = createReq();

    await persistPaymentSessionState(req, {
      caseReference: '1234567890123456',
      serviceRequestReference: 'SR-123',
      feeAmount: 10.99,
      counterClaimType: 'PAYMENT_OR_COMPENSATION',
    });

    expect(req.session.payment).toEqual({
      caseReference: '1234567890123456',
      serviceRequestReference: 'SR-123',
      feeAmount: 10.99,
      counterClaimType: 'PAYMENT_OR_COMPENSATION',
    });
    expect(req.session.save).toHaveBeenCalled();
  });

  it('clears payment session state', async () => {
    const req = createReq({
      payment: {
        paymentReference: 'RC-123',
      },
    });

    await clearPaymentSessionState(req);

    expect(req.session.payment).toBeUndefined();
    expect(req.session.save).toHaveBeenCalled();
  });

  it('retains only payment reference in session state', async () => {
    const req = createReq({
      payment: {
        paymentReference: 'RC-123',
        serviceRequestReference: 'SR-123',
        caseReference: '1234567890123456',
        successRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-successful',
      },
    });

    await retainPaymentReferenceOnly(req);

    expect(req.session.payment).toEqual({
      paymentReference: 'RC-123',
    });
    expect(req.session.save).toHaveBeenCalled();
  });

  it('clears only payment reference in session state', async () => {
    const req = createReq({
      payment: {
        paymentReference: 'RC-123',
        serviceRequestReference: 'SR-123',
        caseReference: '1234567890123456',
        successRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-successful',
      },
    });

    await clearPaymentReferenceOnly(req);

    expect(req.session.payment).toEqual({
      serviceRequestReference: 'SR-123',
      caseReference: '1234567890123456',
      successRedirectUrl: '/case/1234567890123456/respond-to-claim/payment-successful',
    });
    expect(req.session.save).toHaveBeenCalled();
  });
});
