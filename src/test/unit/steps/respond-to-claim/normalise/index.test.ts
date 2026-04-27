import type { PossessionClaimResponse } from '../../../../../main/services/ccdCase.interface';
import { normaliseRespondToClaimDraft } from '../../../../../main/steps/respond-to-claim/normalise';

describe('normaliseRespondToClaimDraft', () => {
  it('returns a fresh object — does not mutate the input', () => {
    const input: PossessionClaimResponse = {
      defendantResponses: {
        paymentAgreement: {
          repaymentPlanAgreed: 'YES',
          repayArrearsInstalments: 'YES',
        },
      },
    };
    const snapshot = JSON.stringify(input);

    normaliseRespondToClaimDraft(input);

    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('is a no-op on an empty response', () => {
    const result = normaliseRespondToClaimDraft({});
    expect(result).toEqual({});
  });
});
