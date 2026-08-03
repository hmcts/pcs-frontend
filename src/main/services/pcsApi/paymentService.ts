import config from 'config';

import { http } from '@modules/http';

export type PaymentLanguage = 'English' | 'Welsh';
export type PaymentOutcome = 'success' | 'failure' | 'pending';

export interface CreateCardPaymentRequest {
  amount: number;
  language: PaymentLanguage;
  returnUrl: string;
}

export interface CreateCardPaymentResponse {
  paymentReference: string;
  status: string;
  nextUrl: string;
}

export interface CardPaymentStatusResponse {
  status: string;
}

export interface StartCardPaymentRequestInput {
  accessToken: string;
  serviceRequestReference: string;
  amount: number;
  requestLanguage?: string;
  returnUrl: string;
}

export interface StartCardPaymentRequestResult {
  paymentReference: string;
  paymentStatus: string;
  nextUrl: string;
}

export interface PbaAccountsResponse {
  pbaAccounts: string[];
}

export interface StartPbaPaymentRequestInput {
  accessToken: string;
  serviceRequestReference: string;
  amount: number;
  accountNumber?: string;
  customerReference: string;
}

export interface CreatePbaPaymentRequest {
  amount: number;
  accountNumber?: string;
  customerReference: string;
}

export interface PbaPaymentResponse {
  paymentReference: string;
  status: string;
  dateCreated: string;
}

function getBaseUrl(): string {
  return config.get('api.url');
}

function getUserAuthHeaders(accessToken: string) {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };
}

export function mapRequestLanguageToPaymentLanguage(requestLanguage?: string): PaymentLanguage {
  return requestLanguage?.toLowerCase() === 'cy' ? 'Welsh' : 'English';
}

const PAYMENT_OUTCOME_BY_STATUS: Record<string, PaymentOutcome> = {
  success: 'success',
  paid: 'success',
  failed: 'failure',
  declined: 'failure',
  initiated: 'pending',
  pending: 'pending',
  created: 'pending',
};

export function getPaymentOutcome(status?: string): PaymentOutcome {
  const normalizedStatus = status?.trim().toLowerCase() ?? '';
  return PAYMENT_OUTCOME_BY_STATUS[normalizedStatus] ?? 'pending';
}

export const paymentService = {
  async createCardPaymentRequest(
    accessToken: string,
    serviceRequestReference: string,
    payload: CreateCardPaymentRequest
  ): Promise<CreateCardPaymentResponse> {
    const pcsApiURL = getBaseUrl();
    const response = await http.post<CreateCardPaymentResponse>(
      `${pcsApiURL}/payment/service-request/${encodeURIComponent(serviceRequestReference)}/card-payment`,
      payload,
      getUserAuthHeaders(accessToken)
    );
    return response.data;
  },

  async createPbaPaymentRequest(
    accessToken: string,
    serviceRequestReference: string,
    payload: CreatePbaPaymentRequest
  ): Promise<PbaPaymentResponse> {
    const pcsApiURL = getBaseUrl();
    const response = await http.post<PbaPaymentResponse>(
      `${pcsApiURL}/payment/service-request/${encodeURIComponent(serviceRequestReference)}/pba`,
      payload,
      getUserAuthHeaders(accessToken)
    );
    return response.data;

  },

  async getCardPaymentStatus(accessToken: string, paymentReference: string): Promise<CardPaymentStatusResponse> {
    const pcsApiURL = getBaseUrl();
    const response = await http.get<CardPaymentStatusResponse>(
      `${pcsApiURL}/payment/card-payment/${encodeURIComponent(paymentReference)}/status`,
      getUserAuthHeaders(accessToken)
    );
    return response.data;
  },

  async startCardPaymentRequest(input: StartCardPaymentRequestInput): Promise<StartCardPaymentRequestResult> {
    const paymentResponse = await this.createCardPaymentRequest(input.accessToken, input.serviceRequestReference, {
      amount: input.amount,
      language: mapRequestLanguageToPaymentLanguage(input.requestLanguage),
      returnUrl: input.returnUrl,
    });

    return {
      paymentReference: paymentResponse.paymentReference,
      paymentStatus: paymentResponse.status,
      nextUrl: paymentResponse.nextUrl,
    };
  },

  async getPbaAccounts(accessToken: string): Promise<PbaAccountsResponse> {
    const pcsApiURL = getBaseUrl();
    const response = await http.get<PbaAccountsResponse>(
      `${pcsApiURL}/payment/pba-accounts`,
      getUserAuthHeaders(accessToken)
    );
    return response.data;
  },

  async startPbaPaymentRequest(input: StartPbaPaymentRequestInput): Promise<PbaPaymentResponse> {
    const paymentResponse = await this.createPbaPaymentRequest(input.accessToken, input.serviceRequestReference, {
      amount: input.amount,
      accountNumber: input.accountNumber,
      customerReference: input.customerReference,
    });

    return {
      status: paymentResponse.status,
      dateCreated: paymentResponse.dateCreated,
      paymentReference: paymentResponse.paymentReference
    };
  },
};
