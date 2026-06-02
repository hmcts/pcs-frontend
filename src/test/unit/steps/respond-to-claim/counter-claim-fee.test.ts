jest.mock('../../../../main/modules/steps', () => ({
  createFormStep: jest.fn(config => config),
}));

// feeLookupService is consumed by extendGetContent; mock it so unit tests don't hit the API.
jest.mock('@services/feeLookupService', () => ({
  getCounterClaimFeeType: jest.fn(),
  getFee: jest.fn(),
}));

const mockSaveDraftDefendantResponse = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockBuildDraftDefendantResponse = jest.fn<any, any>(() => ({
  defendantResponses: {
    makeCounterClaim: 'YES' as const,
    counterClaim: undefined as Record<string, unknown> | undefined,
  },
}));
jest.mock('../../../../main/steps/utils/buildDraftDefendantResponse', () => ({
  saveDraftDefendantResponse: mockSaveDraftDefendantResponse,
  buildDraftDefendantResponse: mockBuildDraftDefendantResponse,
}));

import { step } from '../../../../main/steps/respond-to-claim/counter-claim-fee';

type CounterClaimFeeStep = {
  getInitialFormData: (req: {
    res?: {
      locals?: {
        validatedCase?: {
          data?: {
            possessionClaimResponse?: {
              defendantResponses?: {
                counterClaim?: { needHelpWithFees?: string };
              };
            };
          };
        };
      };
    };
  }) => Record<string, unknown>;
  beforeRedirect: (req: { body?: Record<string, unknown> }) => Promise<void>;
};

const testedStep = step as unknown as CounterClaimFeeStep;

describe('respond-to-claim counter-claim-fee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('beforeRedirect (CCD payload writes)', () => {
    it('saves needHelpWithFees=YES when selection is YES', async () => {
      const req = { body: { counterClaimNeedHelpWithFees: 'YES' } };

      await testedStep.beforeRedirect(req);

      expect(mockSaveDraftDefendantResponse).toHaveBeenCalledTimes(1);
      const saved = mockSaveDraftDefendantResponse.mock.calls[0][1];
      expect(saved.defendantResponses.counterClaim.needHelpWithFees).toBe('YES');
    });

    it('saves needHelpWithFees=NO when selection is NO', async () => {
      const req = { body: { counterClaimNeedHelpWithFees: 'NO' } };

      await testedStep.beforeRedirect(req);

      const saved = mockSaveDraftDefendantResponse.mock.calls[0][1];
      expect(saved.defendantResponses.counterClaim.needHelpWithFees).toBe('NO');
    });

    it('clears needHelpWithFees and saves when selection is missing (rule 5: always save; rule 3: DELETE)', async () => {
      const req = { body: {} };

      await testedStep.beforeRedirect(req);

      expect(mockSaveDraftDefendantResponse).toHaveBeenCalledTimes(1);
      const saved = mockSaveDraftDefendantResponse.mock.calls[0][1];
      expect(saved.defendantResponses.counterClaim.needHelpWithFees).toBeUndefined();
    });

    it('clears needHelpWithFees and saves when body is undefined', async () => {
      const req = { body: undefined };

      await testedStep.beforeRedirect(req);

      expect(mockSaveDraftDefendantResponse).toHaveBeenCalledTimes(1);
      const saved = mockSaveDraftDefendantResponse.mock.calls[0][1];
      expect(saved.defendantResponses.counterClaim.needHelpWithFees).toBeUndefined();
    });

    it('preserves an existing counterClaim object and only touches needHelpWithFees', async () => {
      mockBuildDraftDefendantResponse.mockReturnValueOnce({
        defendantResponses: {
          makeCounterClaim: 'YES',
          counterClaim: { claimType: 'OTHER', needHelpWithFees: 'YES' },
        },
      });
      const req = { body: { counterClaimNeedHelpWithFees: 'NO' } };

      await testedStep.beforeRedirect(req);

      const saved = mockSaveDraftDefendantResponse.mock.calls[0][1];
      expect(saved.defendantResponses.counterClaim).toEqual({ claimType: 'OTHER', needHelpWithFees: 'NO' });
    });
  });

  describe('getInitialFormData', () => {
    it('round-trips YES', () => {
      const result = testedStep.getInitialFormData({
        res: {
          locals: {
            validatedCase: {
              data: {
                possessionClaimResponse: {
                  defendantResponses: { counterClaim: { needHelpWithFees: 'YES' } },
                },
              },
            },
          },
        },
      });
      expect(result).toEqual({ counterClaimNeedHelpWithFees: 'YES' });
    });

    it('round-trips NO', () => {
      const result = testedStep.getInitialFormData({
        res: {
          locals: {
            validatedCase: {
              data: {
                possessionClaimResponse: {
                  defendantResponses: { counterClaim: { needHelpWithFees: 'NO' } },
                },
              },
            },
          },
        },
      });
      expect(result).toEqual({ counterClaimNeedHelpWithFees: 'NO' });
    });

    it('returns empty object when no answer saved', () => {
      const result = testedStep.getInitialFormData({});
      expect(result).toEqual({});
    });
  });
});
