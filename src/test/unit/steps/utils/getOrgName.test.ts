import type { Request } from 'express';

import { getOrganisationName } from '../../../../main/steps/utils/getOrgName';

const mockReq = (organisationName?: unknown): Request =>
  ({
    res: {
      locals: {
        validatedCase: {
          data: {
            possessionClaimResponse: {
              claimantOrganisations: [
                {
                  value: organisationName,
                },
              ],
            },
          },
        },
      },
    },
  }) as unknown as Request;

describe('getOrganisationName', () => {
  it('returns organisationName when present and non-empty', () => {
    expect(getOrganisationName(mockReq('Possession Claims Solicitor Org'))).toBe('Possession Claims Solicitor Org');
  });

  it('falls back to Treetops Housing when organisationName is blank', () => {
    expect(getOrganisationName(mockReq('   '))).toBe('Treetops Housing');
  });

  it('falls back to Treetops Housing when organisationName is missing', () => {
    expect(getOrganisationName({} as Request)).toBe('Treetops Housing');
  });
});
