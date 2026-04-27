import { normaliseContactPreferences } from '../../../../../main/steps/respond-to-claim/normalise/normaliseContactPreferences';

import type { PossessionClaimResponse } from '@services/ccdCase.interface';

describe('normaliseContactPreferences', () => {
  it('should preserve phone sub-questions when preferenceType is EMAIL', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        preferenceType: 'EMAIL',
        contactByPhone: 'YES',
        contactByText: 'NO',
      },
    };

    normaliseContactPreferences(response);

    // EMAIL allows secondary phone/text notifications
    expect(response.defendantResponses?.contactByPhone).toBe('YES');
    expect(response.defendantResponses?.contactByText).toBe('NO');
    expect(response.defendantResponses?.preferenceType).toBe('EMAIL');
  });

  it('should clear phone sub-questions when preferenceType is POST', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        preferenceType: 'POST',
        contactByPhone: 'YES',
        contactByText: 'NO',
      },
    };

    normaliseContactPreferences(response);

    // POST means no electronic communication at all
    expect(response.defendantResponses?.contactByPhone).toBeUndefined();
    expect(response.defendantResponses?.contactByText).toBeUndefined();
    expect(response.defendantResponses?.preferenceType).toBe('POST');
  });

  it('should clear all contact sub-questions when preferenceType is not set', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        contactByPhone: 'YES',
        contactByText: 'YES',
        // preferenceType is undefined
      },
    };

    normaliseContactPreferences(response);

    expect(response.defendantResponses?.contactByPhone).toBeUndefined();
    expect(response.defendantResponses?.contactByText).toBeUndefined();
  });

  it('should handle response with no defendantResponses', () => {
    const response: PossessionClaimResponse = {};

    expect(() => normaliseContactPreferences(response)).not.toThrow();
  });

  it('should handle response with empty defendantResponses', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {},
    };

    normaliseContactPreferences(response);

    expect(response.defendantResponses?.contactByPhone).toBeUndefined();
    expect(response.defendantResponses?.contactByText).toBeUndefined();
  });

  it('should not affect other defendantResponses fields when clearing', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        preferenceType: 'POST',
        contactByPhone: 'YES',
        contactByText: 'YES',
        freeLegalAdvice: 'NO',
        possessionNoticeReceived: 'YES',
      },
    };

    normaliseContactPreferences(response);

    expect(response.defendantResponses?.contactByPhone).toBeUndefined();
    expect(response.defendantResponses?.contactByText).toBeUndefined();
    expect(response.defendantResponses?.freeLegalAdvice).toBe('NO');
    expect(response.defendantResponses?.possessionNoticeReceived).toBe('YES');
    expect(response.defendantResponses?.preferenceType).toBe('POST');
  });

  it('should not affect other defendantResponses fields when preserving', () => {
    const response: PossessionClaimResponse = {
      defendantResponses: {
        preferenceType: 'EMAIL',
        contactByPhone: 'YES',
        contactByText: 'NO',
        freeLegalAdvice: 'NO',
        possessionNoticeReceived: 'YES',
      },
    };

    normaliseContactPreferences(response);

    expect(response.defendantResponses?.contactByPhone).toBe('YES');
    expect(response.defendantResponses?.contactByText).toBe('NO');
    expect(response.defendantResponses?.freeLegalAdvice).toBe('NO');
    expect(response.defendantResponses?.possessionNoticeReceived).toBe('YES');
    expect(response.defendantResponses?.preferenceType).toBe('EMAIL');
  });
});
