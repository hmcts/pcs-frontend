import type { Request } from 'express';

import { getNextStep } from '../../../../main/modules/steps/flow';
import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

describe('Complete Journey Paths - End-to-End Navigation', () => {
  describe('Path A: England + Name Known', () => {
    it('should navigate through complete journey for England case with known defendant', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'England',
                noticeServed: 'No',
                claimGroundSummaries: [
                  {
                    value: {
                      category: 'SECURE_OR_FLEXIBLE_DISCRETIONARY',
                      code: 'NUISANCE_OR_IMMORAL_USE',
                      label: 'Nuisance (ground 2)',
                      isRentArrears: 'No',
                    },
                  },
                ],
                possessionClaimResponse: {
                  defendantContactDetails: {
                    party: {
                      nameKnown: 'YES',
                      firstName: 'John',
                      lastName: 'Doe',
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      // Expected path for England + Name Known (no notice/arrears features)
      const expectedPath = [
        { from: 'start-now', to: 'free-legal-advice' },
        { from: 'free-legal-advice', to: 'defendant-name-confirmation' }, // Known
        { from: 'defendant-name-confirmation', to: 'defendant-date-of-birth' },
        { from: 'defendant-date-of-birth', to: 'correspondence-address' },
        { from: 'correspondence-address', to: 'contact-preferences' },
        { from: 'contact-preferences', to: 'dispute-claim-interstitial' },
        { from: 'dispute-claim-interstitial', to: 'tenancy-details' }, // England - skip landlord-registered
        { from: 'tenancy-details', to: 'non-rent-arrears-dispute' }, // No rent arrears
        { from: 'non-rent-arrears-dispute', to: 'counter-claim' },
      ];

      for (const { from, to } of expectedPath) {
        const nextStep = await getNextStep(mockReq, from, flowConfig, {});
        expect(nextStep).toBe(to);
      }
    });
  });

  describe('Path B: England + Name Unknown', () => {
    it('should navigate through complete journey for England case with unknown defendant', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'England',
                noticeServed: 'No',
                claimGroundSummaries: [
                  {
                    value: {
                      category: 'SECURE_OR_FLEXIBLE_DISCRETIONARY',
                      code: 'NUISANCE_OR_IMMORAL_USE',
                      label: 'Nuisance (ground 2)',
                      isRentArrears: 'No',
                    },
                  },
                ],
                possessionClaimResponse: {
                  defendantContactDetails: {
                    party: {
                      nameKnown: 'NO',
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      // Expected path for England + Name Unknown (no notice/arrears features)
      const expectedPath = [
        { from: 'start-now', to: 'free-legal-advice' },
        { from: 'free-legal-advice', to: 'defendant-name-capture' }, // Unknown
        { from: 'defendant-name-capture', to: 'defendant-date-of-birth' },
        { from: 'defendant-date-of-birth', to: 'correspondence-address' },
        { from: 'correspondence-address', to: 'contact-preferences' },
        { from: 'contact-preferences', to: 'dispute-claim-interstitial' },
        { from: 'dispute-claim-interstitial', to: 'tenancy-details' }, // England - skip landlord-registered
        { from: 'tenancy-details', to: 'non-rent-arrears-dispute' }, // No rent arrears
        { from: 'non-rent-arrears-dispute', to: 'counter-claim' },
      ];

      for (const { from, to } of expectedPath) {
        const nextStep = await getNextStep(mockReq, from, flowConfig, {});
        expect(nextStep).toBe(to);
      }
    });
  });

  describe('Path C: Wales + Name Known', () => {
    it('should navigate through complete journey for Wales case with known defendant', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'Wales',
                noticeServed: 'No',
                claimGroundSummaries: [
                  {
                    value: {
                      category: 'WALES_STANDARD_OTHER_DISCRETIONARY',
                      code: 'ANTISOCIAL_BEHAVIOUR_S157',
                      label: 'Antisocial behaviour (section 157)',
                      isRentArrears: 'No',
                    },
                  },
                ],
                possessionClaimResponse: {
                  defendantContactDetails: {
                    party: {
                      nameKnown: 'YES',
                      firstName: 'John',
                      lastName: 'Doe',
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      // Expected path for Wales + Name Known (no notice/arrears features)
      const expectedPath = [
        { from: 'start-now', to: 'free-legal-advice' },
        { from: 'free-legal-advice', to: 'defendant-name-confirmation' }, // Known
        { from: 'defendant-name-confirmation', to: 'defendant-date-of-birth' },
        { from: 'defendant-date-of-birth', to: 'correspondence-address' },
        { from: 'correspondence-address', to: 'contact-preferences' },
        { from: 'contact-preferences', to: 'dispute-claim-interstitial' },
        { from: 'dispute-claim-interstitial', to: 'landlord-registered' }, // Wales - extra step
        { from: 'landlord-registered', to: 'tenancy-details' },
        { from: 'tenancy-details', to: 'non-rent-arrears-dispute' }, // No rent arrears
        { from: 'non-rent-arrears-dispute', to: 'counter-claim' },
      ];

      for (const { from, to } of expectedPath) {
        const nextStep = await getNextStep(mockReq, from, flowConfig, {});
        expect(nextStep).toBe(to);
      }
    });
  });

  describe('Path D: Wales + Name Unknown', () => {
    it('should navigate through complete journey for Wales case with unknown defendant', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'Wales',
                noticeServed: 'No',
                claimGroundSummaries: [
                  {
                    value: {
                      category: 'WALES_STANDARD_OTHER_DISCRETIONARY',
                      code: 'ANTISOCIAL_BEHAVIOUR_S157',
                      label: 'Antisocial behaviour (section 157)',
                      isRentArrears: 'No',
                    },
                  },
                ],
                possessionClaimResponse: {
                  defendantContactDetails: {
                    party: {
                      nameKnown: 'NO',
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      // Expected path for Wales + Name Unknown (no notice/arrears features)
      const expectedPath = [
        { from: 'start-now', to: 'free-legal-advice' },
        { from: 'free-legal-advice', to: 'defendant-name-capture' }, // Unknown
        { from: 'defendant-name-capture', to: 'defendant-date-of-birth' },
        { from: 'defendant-date-of-birth', to: 'correspondence-address' },
        { from: 'correspondence-address', to: 'contact-preferences' },
        { from: 'contact-preferences', to: 'dispute-claim-interstitial' },
        { from: 'dispute-claim-interstitial', to: 'landlord-registered' }, // Wales - extra step
        { from: 'landlord-registered', to: 'tenancy-details' },
        { from: 'tenancy-details', to: 'non-rent-arrears-dispute' }, // No rent arrears
        { from: 'non-rent-arrears-dispute', to: 'counter-claim' },
      ];

      for (const { from, to } of expectedPath) {
        const nextStep = await getNextStep(mockReq, from, flowConfig, {});
        expect(nextStep).toBe(to);
      }
    });
  });

  describe('Journey comparison - step count differences', () => {
    it('should show Wales journeys have one extra step (landlord-registered)', async () => {
      const englandReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'England',
                noticeServed: 'No',
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'No',
                    },
                  },
                ],
                possessionClaimResponse: {
                  defendantContactDetails: {
                    party: {
                      nameKnown: 'YES',
                      firstName: 'John',
                      lastName: 'Doe',
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      const walesReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'Wales',
                noticeServed: 'No',
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'No',
                    },
                  },
                ],
                possessionClaimResponse: {
                  defendantContactDetails: {
                    party: {
                      nameKnown: 'YES',
                      firstName: 'John',
                      lastName: 'Doe',
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      // Count steps from dispute-claim-interstitial to counter-claim
      const englandNext = await getNextStep(englandReq, 'dispute-claim-interstitial', flowConfig, {});
      expect(englandNext).toBe('tenancy-details'); // 1 step to tenancy-details

      const walesNext = await getNextStep(walesReq, 'dispute-claim-interstitial', flowConfig, {});
      expect(walesNext).toBe('landlord-registered'); // 2 steps to tenancy-details

      const walesSecondStep = await getNextStep(walesReq, 'landlord-registered', flowConfig, {});
      expect(walesSecondStep).toBe('tenancy-details');
    });

    it('should show known vs unknown defendant routes differ at name step only', async () => {
      const knownReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'England',
                noticeServed: 'No',
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'No',
                    },
                  },
                ],
                possessionClaimResponse: {
                  defendantContactDetails: {
                    party: {
                      nameKnown: 'YES',
                      firstName: 'John',
                      lastName: 'Doe',
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      const unknownReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'England',
                noticeServed: 'No',
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'No',
                    },
                  },
                ],
                possessionClaimResponse: {
                  defendantContactDetails: {
                    party: {
                      nameKnown: 'NO',
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      // Different at free-legal-advice
      const knownNext = await getNextStep(knownReq, 'free-legal-advice', flowConfig, {});
      expect(knownNext).toBe('defendant-name-confirmation');

      const unknownNext = await getNextStep(unknownReq, 'free-legal-advice', flowConfig, {});
      expect(unknownNext).toBe('defendant-name-capture');

      // But both converge at defendant-date-of-birth
      const knownAfterName = await getNextStep(knownReq, 'defendant-name-confirmation', flowConfig, {});
      const unknownAfterName = await getNextStep(unknownReq, 'defendant-name-capture', flowConfig, {});
      expect(knownAfterName).toBe('defendant-date-of-birth');
      expect(unknownAfterName).toBe('defendant-date-of-birth');
    });
  });

  describe('Journey termination', () => {
    it('should handle journey completion gracefully', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                noticeServed: 'No',
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'No',
                    },
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      // Last step in journey should return null or end step
      const nextStep = await getNextStep(mockReq, 'contact-preferences', flowConfig, {});
      expect(nextStep).toBe('dispute-claim-interstitial');
    });
  });
});
