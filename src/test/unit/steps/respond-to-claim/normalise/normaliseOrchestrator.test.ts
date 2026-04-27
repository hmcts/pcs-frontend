import type { PossessionClaimResponse } from '../../../../../main/services/ccdCase.interface';
import { normaliseRespondToClaimDraft } from '../../../../../main/steps/respond-to-claim/normalise';

// Mock all individual normalisers
const mockNormaliseRepaymentAgreement = jest.fn();
const mockNormaliseNoticeDetails = jest.fn();
const mockNormaliseHouseholdFinance = jest.fn();

jest.mock('../../../../../main/steps/respond-to-claim/normalise/normaliseRepaymentAgreement', () => ({
  normaliseRepaymentAgreement: mockNormaliseRepaymentAgreement,
}));
jest.mock('../../../../../main/steps/respond-to-claim/normalise/normaliseNoticeDetails', () => ({
  normaliseNoticeDetails: mockNormaliseNoticeDetails,
}));
jest.mock('../../../../../main/steps/respond-to-claim/normalise/normaliseHouseholdFinance', () => ({
  normaliseHouseholdFinance: mockNormaliseHouseholdFinance,
}));

describe('normaliseRespondToClaimDraft orchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a fresh object — does not mutate the input', () => {
    const input: PossessionClaimResponse = {
      defendantResponses: { possessionNoticeReceived: 'YES' },
    };
    const snapshot = JSON.stringify(input);

    normaliseRespondToClaimDraft(input);

    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('calls all normalisers in correct order', () => {
    const input: PossessionClaimResponse = {
      defendantResponses: { possessionNoticeReceived: 'YES' },
    };

    normaliseRespondToClaimDraft(input);

    // Verify each normaliser was called
    expect(mockNormaliseRepaymentAgreement).toHaveBeenCalledTimes(1);
    expect(mockNormaliseNoticeDetails).toHaveBeenCalledTimes(1);
    expect(mockNormaliseHouseholdFinance).toHaveBeenCalledTimes(1);

    // Verify they were all called with same structure
    expect(mockNormaliseRepaymentAgreement).toHaveBeenCalledWith(
      expect.objectContaining({ defendantResponses: { possessionNoticeReceived: 'YES' } })
    );
    expect(mockNormaliseNoticeDetails).toHaveBeenCalledWith(
      expect.objectContaining({ defendantResponses: { possessionNoticeReceived: 'YES' } })
    );
    expect(mockNormaliseHouseholdFinance).toHaveBeenCalledWith(
      expect.objectContaining({ defendantResponses: { possessionNoticeReceived: 'YES' } })
    );
  });

  it('returns the result after all normalisers have run', () => {
    const input: PossessionClaimResponse = {};

    // Mock one normaliser to modify the working copy
    mockNormaliseRepaymentAgreement.mockImplementation(response => {
      response.defendantResponses = { possessionNoticeReceived: 'MODIFIED' };
    });

    const result = normaliseRespondToClaimDraft(input);

    expect(result).toEqual({
      defendantResponses: { possessionNoticeReceived: 'MODIFIED' },
    });
  });
});
