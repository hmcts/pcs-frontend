import type { PossessionClaimResponse } from '../../../../../main/services/ccdCase.interface';
import { normaliseContactPreferences } from '../../../../../main/steps/respond-to-claim/normalise/normaliseContactPreferences';

describe('normaliseContactPreferences', () => {
  it('drops contactByText when contactByPhone is NO', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        contactByPhone: 'NO',
        contactByText: 'YES',
      },
    };

    normaliseContactPreferences(response);

    expect(response.defendantResponses).toEqual({ contactByPhone: 'NO' });
  });

  it('drops contactByText when contactByPhone is undefined', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        contactByText: 'YES',
      },
    };

    normaliseContactPreferences(response);

    expect(response.defendantResponses).toEqual({});
  });

  it('keeps contactByText when contactByPhone is YES', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        contactByPhone: 'YES',
        contactByText: 'NO',
      },
    };

    normaliseContactPreferences(response);

    expect(response.defendantResponses).toEqual({
      contactByPhone: 'YES',
      contactByText: 'NO',
    });
  });

  it('is a no-op when contactByText is not present', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        contactByPhone: 'NO',
      },
    };

    normaliseContactPreferences(response);

    expect(response.defendantResponses).toEqual({ contactByPhone: 'NO' });
  });

  it('is a no-op on empty response', () => {
    const response = {} as PossessionClaimResponse;
    normaliseContactPreferences(response);
    expect(response).toEqual({});
  });

  it('is idempotent — calling twice gives same result as once', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: { contactByPhone: 'NO', contactByText: 'YES' },
    };

    normaliseContactPreferences(response);
    const afterOnce = JSON.stringify(response);
    normaliseContactPreferences(response);
    expect(JSON.stringify(response)).toBe(afterOnce);
  });

  // CCD echoes YesOrNo PascalCase since pcs-api PR #1678 — keep contactByText when
  // contactByPhone comes back as "Yes" instead of "YES".
  it('treats PascalCase "Yes" on contactByPhone the same as "YES"', () => {
    const response = {
      // Cast simulates BE returning out-of-type casing — the static type is 'YES'/'NO'.
      defendantResponses: { contactByPhone: 'Yes' as 'YES', contactByText: 'YES' },
    } as PossessionClaimResponse;

    normaliseContactPreferences(response);

    expect(response.defendantResponses?.contactByText).toBe('YES');
  });
});
