import type { Request } from 'express';

import { shouldShowExemptLandlordStep } from '../../../../main/steps/utils/shouldShowExemptLandlordStep';

const makeReq = (legislativeCountry: string, release12Enabled: boolean): Request =>
  ({
    res: {
      locals: {
        validatedCase: { data: { legislativeCountry } },
        release12Enabled,
      },
    },
  }) as unknown as Request;

describe('shouldShowExemptLandlordStep', () => {
  it('returns true for Wales when release 1.2 is enabled', () => {
    expect(shouldShowExemptLandlordStep(makeReq('Wales', true))).toBe(true);
  });

  it('returns false for Wales when release 1.2 is disabled', () => {
    expect(shouldShowExemptLandlordStep(makeReq('Wales', false))).toBe(false);
  });

  it('returns false for England even when release 1.2 is enabled', () => {
    expect(shouldShowExemptLandlordStep(makeReq('England', true))).toBe(false);
  });
});
