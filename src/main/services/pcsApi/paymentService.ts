import config from 'config';

import { http } from '@modules/http';

export type PaymentLanguage = 'English' | 'Welsh';
export type PaymentOutcome = 'success' | 'failure' | 'pending';

export interface CreateServiceRequestPayload {
  caseReference: string | number;
  feeType: string;
}

export interface CreateServiceRequestResponse {
  serviceRequestReference: string;
  feeAmount: number;
}

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

export interface StartCardPaymentJourneyInput {
  accessToken: string;
  caseReference: string | number;
  feeType: string;
  amount: number;
  requestLanguage?: string;
  returnUrl: string;
}

export interface StartCardPaymentJourneyResult {
  serviceRequestReference: string;
  paymentReference: string;
  paymentStatus: string;
  nextUrl: string;
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

export function getPaymentOutcome(status?: string): PaymentOutcome {
  const normalizedStatus = status?.trim().toLowerCase() || '';

  if (['success', 'paid'].includes(normalizedStatus)) {
    return 'success';
  }

  if (
    ['failed', 'cancelled', 'canceled', 'error', 'not paid', 'not_paid', 'partially paid'].includes(normalizedStatus)
  ) {
    return 'failure';
  }

  return 'pending';
}

export const paymentService = {
  async createServiceRequest(
    accessToken: string,
    payload: CreateServiceRequestPayload
  ): Promise<CreateServiceRequestResponse> {
    const pcsApiURL = getBaseUrl();
    const response = await http.post<CreateServiceRequestResponse>(
      `${pcsApiURL}/payment/service-request`,
      payload,
      getUserAuthHeaders(accessToken)
    );
    return response.data;
  },

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

  async getCardPaymentStatus(accessToken: string, paymentReference: string): Promise<CardPaymentStatusResponse> {
    const pcsApiURL = getBaseUrl();
    const response = await http.get<CardPaymentStatusResponse>(
      `${pcsApiURL}/payment/card-payment/${encodeURIComponent(paymentReference)}/status`,
      getUserAuthHeaders(accessToken)
    );
    return response.data;
  },

  async startCardPaymentJourney(input: StartCardPaymentJourneyInput): Promise<StartCardPaymentJourneyResult> {
    const serviceRequestResponse = await this.createServiceRequest(input.accessToken, {
      caseReference: input.caseReference,
      feeType: input.feeType,
    });

    const paymentResponse = await this.createCardPaymentRequest(
      input.accessToken,
      serviceRequestResponse.serviceRequestReference,
      {
        amount: input.amount,
        language: mapRequestLanguageToPaymentLanguage(input.requestLanguage),
        returnUrl: input.returnUrl,
      }
    );

    return {
      serviceRequestReference: serviceRequestResponse.serviceRequestReference,
      paymentReference: paymentResponse.paymentReference,
      paymentStatus: paymentResponse.status,
      nextUrl: paymentResponse.nextUrl,
    };
  },
};
