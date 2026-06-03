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

export function clearPaymentSessionState(req: Request): void {
  delete req.session.payment;
}
