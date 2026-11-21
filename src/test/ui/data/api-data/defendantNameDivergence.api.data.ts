import { AxiosRequestConfig } from 'axios';

export const defendantNameDivergenceApiData = {
  defendantNameDivergenceApiInstance: (): AxiosRequestConfig => ({
    baseURL: process.env.PCS_API_URL,
    headers: {
      ServiceAuthorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      experimental: 'experimental',
      Accept: '*/*',
    },
  }),
  defendantNameDivergenceApiEndPoint: (): string =>
    `/testing-support/defendant-name-divergence/${process.env.CASE_NUMBER}`,

  /**
   * Case creation goes through pcs-api's own testing-support orchestrator rather than the CCD event pair the
   * other specs use. The orchestrator merges the given overrides over a base payload that lives in pcs-api
   * (src/main/resources/testing-support/Create-Case-ENGLAND-Base.json), so it cannot drift from the case type
   * the way the shared submit payloads in this repo have. It needs a user token as well as S2S because it
   * calls CCD as the claimant solicitor.
   */
  testCaseCreationApiInstance: (): AxiosRequestConfig => ({
    baseURL: process.env.PCS_API_URL,
    headers: {
      Authorization: `Bearer ${process.env.BEARER_TOKEN}`,
      ServiceAuthorization: `Bearer ${process.env.SERVICE_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      experimental: 'experimental',
      Accept: '*/*',
    },
  }),

  /**
   * issueAndGenerateAccessCodes issues the case and creates the defendant access codes synchronously, so the
   * PIN can be read straight away without driving payment or waiting for the db-scheduler.
   */
  createTestCaseApiEndPoint: (legislativeCountry = 'ENGLAND'): string =>
    `/testing-support/${legislativeCountry}/create-case?issueAndGenerateAccessCodes=true`,

  /**
   * respondPossessionClaim is only available from CASE_ISSUED onwards (EventStates.respondPossessionClaim), and a
   * newly created claim sits in PENDING_CASE_ISSUED until the fee is paid. The service request reference needed to
   * confirm payment is written asynchronously by the fee/pay db-scheduler task, so this is polled for.
   */
  feePaymentInfoApiEndPoint: (): string => `/testing-support/fee-payment-info/${process.env.CASE_NUMBER}`,

  /** What CCPay PUTs back to pcs-api once the claim fee is paid, which fires claimIssuePayment. */
  paymentCallbackApiEndPoint: '/payment-update',

  paidServiceRequestCallback: (serviceRequestReference: string, amount: number): Record<string, unknown> => ({
    service_request_reference: serviceRequestReference,
    ccd_case_number: process.env.CASE_NUMBER,
    service_request_amount: amount,
    service_request_status: 'Paid',
    payment: {
      payment_amount: amount,
      payment_reference: `RC-TEST-${process.env.CASE_NUMBER}`,
      payment_method: 'payment by account',
      case_reference: process.env.CASE_NUMBER,
      account_number: 'PBA0088311',
    },
  }),
};
