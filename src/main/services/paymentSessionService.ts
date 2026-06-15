import type { Request } from 'express';

export interface PaymentSessionState {
  caseReference?: string;
  serviceRequestReference?: string;
  paymentReference?: string;
  feeAmount?: number;
  counterClaimAmountInPence?: string;
  counterClaimType?: string;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
  pendingRedirectUrl?: string;
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save(err => (err ? reject(err) : resolve()));
  });
}

export function setPaymentSessionState(req: Request, paymentSessionState: PaymentSessionState): void {
  req.session.payment = {
    ...paymentSessionState,
  };
}

export function getPaymentSessionState(req: Request): PaymentSessionState | undefined {
  return req.session.payment;
}

export async function clearPaymentSessionState(req: Request): Promise<void> {
  delete req.session.payment;
  await saveSession(req);
}

export async function retainPaymentReferenceOnly(req: Request): Promise<void> {
  const paymentReference = req.session.payment?.paymentReference;

  if (!paymentReference) {
    await clearPaymentSessionState(req);
    return;
  }

  req.session.payment = {
    paymentReference,
  };
  await saveSession(req);
}

export async function clearPaymentReferenceOnly(req: Request): Promise<void> {
  const paymentSessionState = getPaymentSessionState(req);
  if (paymentSessionState) {
    delete paymentSessionState.paymentReference;
    await saveSession(req);
  }
}
