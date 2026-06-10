import type { Request } from 'express';

export interface PaymentSessionState {
  caseReference?: string;
  serviceRequestReference?: string;
  paymentReference?: string;
  feeAmount?: number;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
  pendingRedirectUrl?: string;
}

export function setPaymentSessionState(req: Request, paymentSessionState: PaymentSessionState): void {
  req.session.payment = {
    ...paymentSessionState,
  };
}

export function getPaymentSessionState(req: Request): PaymentSessionState | undefined {
  return req.session.payment;
}

export function clearPaymentSessionState(req: Request): void {
  delete req.session.payment;
}

export function retainPaymentReferenceOnly(req: Request): void {
  const paymentReference = req.session.payment?.paymentReference;

  if (!paymentReference) {
    clearPaymentSessionState(req);
    return;
  }

  req.session.payment = {
    paymentReference,
  };
}

export function clearPaymentReferenceOnly(req: Request): void {
  const paymentSessionState = getPaymentSessionState(req);
  if (paymentSessionState) {
    delete paymentSessionState.paymentReference;
  }
}
