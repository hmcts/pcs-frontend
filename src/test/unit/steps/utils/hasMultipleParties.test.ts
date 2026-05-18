import { Request } from 'express';

import { hasMultipleParties } from '../../../../main/steps/utils/hasMultipleParties';

describe('hasMultipleParties', () => {
  it('returns true when there are at least two named parties other than current defendant', () => {
    const req = {
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                currentDefendantPartyId: 'def-1',
              },
              allDefendants: [
                { id: 'def-1', value: { firstName: 'Current', lastName: 'Defendant' } },
                { id: 'def-2', value: { firstName: 'Other', lastName: 'Defendant' } },
              ],
              allClaimants: [{ id: 'claim-1', value: { orgName: 'Landlord Org' } }],
            },
          },
        },
      },
    } as unknown as Request;

    expect(hasMultipleParties(req)).toBe(true);
  });

  it('returns false when fewer than two named parties remain after excluding current defendant', () => {
    const req = {
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                currentDefendantPartyId: 'def-1',
              },
              allDefendants: [{ id: 'def-1', value: { firstName: 'Current', lastName: 'Defendant' } }],
              allClaimants: [{ id: 'claim-1', value: { orgName: 'Landlord Org' } }],
            },
          },
        },
      },
    } as unknown as Request;

    expect(hasMultipleParties(req)).toBe(false);
  });

  it('ignores unnamed parties while counting', () => {
    const req = {
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                currentDefendantPartyId: 'def-1',
              },
              allDefendants: [
                { id: 'def-1', value: { firstName: 'Current', lastName: 'Defendant' } },
                { id: 'def-2', value: { firstName: 'Other' } },
              ],
              allClaimants: [
                { id: 'claim-1', value: { orgName: 'Landlord Org' } },
                { id: 'claim-2', value: {} },
              ],
            },
          },
        },
      },
    } as unknown as Request;

    expect(hasMultipleParties(req)).toBe(true);
  });

  it('returns false with current defendant, unnamed defendant, and claimant', () => {
    const req = {
      res: {
        locals: {
          validatedCase: {
            data: {
              possessionClaimResponse: {
                currentDefendantPartyId: 'def-1',
              },
              allDefendants: [
                { id: 'def-1', value: { firstName: 'Current', lastName: 'Defendant' } },
                { id: 'def-2', value: {} },
              ],
              allClaimants: [{ id: 'claim-1', value: { orgName: 'Landlord Org' } }],
            },
          },
        },
      },
    } as unknown as Request;

    expect(hasMultipleParties(req)).toBe(false);
  });
});
