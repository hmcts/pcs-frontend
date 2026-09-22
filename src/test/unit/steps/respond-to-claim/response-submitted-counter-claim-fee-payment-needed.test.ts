jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
  getTranslationFunction: jest.fn(),
}));

import { getTranslationFunction } from '../../../../main/modules/steps';
import { step } from '../../../../main/steps/respond-to-claim/response-submitted-counter-claim-fee-payment-needed';

type ResponseSubmittedCounterClaimFeePaymentNeededStep = {
  extendGetContent: (req: { params: { caseReference?: string } }) => Record<string, string>;
};

describe('response-submitted-counter-claim-fee-payment-needed step', () => {
  const testedStep = step as unknown as ResponseSubmittedCounterClaimFeePaymentNeededStep;
  const tMock = jest.fn((key: string, options?: Record<string, unknown>) => {
    const interpolatedUrl =
      typeof options?.counterClaimApplicationFeeAmountUrl === 'string'
        ? options.counterClaimApplicationFeeAmountUrl
        : '';
    return `${key}:${interpolatedUrl}`;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getTranslationFunction as jest.Mock).mockReturnValue(tMock);
  });

  it('interpolates the counterclaim application fee amount route with case reference', () => {
    const content = testedStep.extendGetContent({
      params: { caseReference: '1234567890123456' },
    });

    expect(tMock).toHaveBeenCalledWith('responseSubmittedCounterClaimFeePaymentNeededListItem1', {
      counterClaimApplicationFeeAmountUrl:
        '/case/1234567890123456/respond-to-claim/counter-claim-application-fee-amount',
    });
    expect(content.responseSubmittedCounterClaimFeePaymentNeededListItem1).toBe(
      'responseSubmittedCounterClaimFeePaymentNeededListItem1:/case/1234567890123456/respond-to-claim/counter-claim-application-fee-amount'
    );
    expect(content.backUrl).toBe('');
  });

  it('falls back to # when case reference is unavailable', () => {
    const content = testedStep.extendGetContent({
      params: {},
    });

    expect(tMock).toHaveBeenCalledWith('responseSubmittedCounterClaimFeePaymentNeededListItem1', {
      counterClaimApplicationFeeAmountUrl: '#',
    });
    expect(content.responseSubmittedCounterClaimFeePaymentNeededListItem1).toBe(
      'responseSubmittedCounterClaimFeePaymentNeededListItem1:#'
    );
    expect(content.backUrl).toBe('');
  });
});
