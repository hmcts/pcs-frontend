import config from 'config';

import {
  getPaymentOutcome,
  mapRequestLanguageToPaymentLanguage,
  paymentService,
} from '@services/pcsApi/paymentService';

jest.mock('config', () => ({
  get: jest.fn(),
}));

jest.mock('@modules/http', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const testApiBase = 'http://mock-api';
const mockHttp = require('../../../../main/modules/http').http;

describe('paymentService', () => {
  beforeEach(() => {
    (config.get as jest.Mock).mockReturnValue(testApiBase);
    jest.clearAllMocks();
  });

  it('creates a service request with user auth headers', async () => {
    const responsePayload = { serviceRequestReference: 'SR-123', feeAmount: 10.99 };
    mockHttp.post.mockResolvedValue({ data: responsePayload });

    const response = await paymentService.createServiceRequest('token-123', {
      caseReference: '9315681809157729',
      feeType: 'genAppStandardFee',
    });

    expect(response).toEqual(responsePayload);
    expect(mockHttp.post).toHaveBeenCalledWith(
      `${testApiBase}/payment/service-request`,
      { caseReference: '9315681809157729', feeType: 'genAppStandardFee' },
      {
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        },
      }
    );
  });

  it('creates a card payment request with encoded service request reference', async () => {
    const responsePayload = { paymentReference: 'RC-123', status: 'Created', nextUrl: 'https://next.url' };
    mockHttp.post.mockResolvedValue({ data: responsePayload });

    const response = await paymentService.createCardPaymentRequest('token-123', 'SR 123', {
      amount: 10.99,
      language: 'English',
      returnUrl: 'https://frontend/payment/return',
    });

    expect(response).toEqual(responsePayload);
    expect(mockHttp.post).toHaveBeenCalledWith(
      `${testApiBase}/payment/service-request/SR%20123/card-payment`,
      {
        amount: 10.99,
        language: 'English',
        returnUrl: 'https://frontend/payment/return',
      },
      {
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        },
      }
    );
  });

  it('gets card payment status with encoded payment reference', async () => {
    const responsePayload = { status: 'Success' };
    mockHttp.get.mockResolvedValue({ data: responsePayload });

    const response = await paymentService.getCardPaymentStatus('token-123', 'RC 123');

    expect(response).toEqual(responsePayload);
    expect(mockHttp.get).toHaveBeenCalledWith(`${testApiBase}/payment/card-payment/RC%20123/status`, {
      headers: {
        Authorization: 'Bearer token-123',
        'Content-Type': 'application/json',
      },
    });
  });

  it('starts card payment journey by chaining service request and card payment request', async () => {
    mockHttp.post
      .mockResolvedValueOnce({ data: { serviceRequestReference: 'SR-123', feeAmount: 10.99 } })
      .mockResolvedValueOnce({
        data: { paymentReference: 'RC-123', status: 'Created', nextUrl: 'https://gov.pay/url' },
      });

    const response = await paymentService.startCardPaymentJourney({
      accessToken: 'token-123',
      caseReference: '9315681809157729',
      feeType: 'genAppStandardFee',
      amount: 10.99,
      requestLanguage: 'cy',
      returnUrl: 'https://frontend/payment/return',
    });

    expect(response).toEqual({
      serviceRequestReference: 'SR-123',
      paymentReference: 'RC-123',
      paymentStatus: 'Created',
      nextUrl: 'https://gov.pay/url',
    });

    expect(mockHttp.post).toHaveBeenNthCalledWith(
      1,
      `${testApiBase}/payment/service-request`,
      { caseReference: '9315681809157729', feeType: 'genAppStandardFee' },
      {
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        },
      }
    );

    expect(mockHttp.post).toHaveBeenNthCalledWith(
      2,
      `${testApiBase}/payment/service-request/SR-123/card-payment`,
      { amount: 10.99, language: 'Welsh', returnUrl: 'https://frontend/payment/return' },
      {
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        },
      }
    );
  });
});

describe('payment helpers', () => {
  it.each([
    ['cy', 'Welsh'],
    ['CY', 'Welsh'],
    ['en', 'English'],
    [undefined, 'English'],
  ])('maps request language %s to %s', (input, expected) => {
    expect(mapRequestLanguageToPaymentLanguage(input)).toBe(expected);
  });

  it.each([
    ['Success', 'success'],
    ['Paid', 'success'],
    ['failed', 'failure'],
    ['Not paid', 'failure'],
    ['Partially paid', 'failure'],
    ['created', 'pending'],
    [undefined, 'pending'],
  ])('maps payment status %s to %s outcome', (status, expected) => {
    expect(getPaymentOutcome(status)).toBe(expected);
  });
});
