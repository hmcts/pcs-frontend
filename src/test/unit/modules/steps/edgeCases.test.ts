import type { Request } from 'express';

import { getNextStep, getPreviousStep } from '../../../../main/modules/steps/flow';
import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

describe('Edge Cases and Error Handling', () => {
  describe('Missing validatedCase in res.locals', () => {
    it('should use defaultNext when validatedCase is completely missing', async () => {
      const mockReq = {
        res: {
          locals: {},
        },
      } as unknown as Request;

      // free-legal-advice should default to defendant-name-capture
      const nextStep = await getNextStep(mockReq, 'free-legal-advice', flowConfig, {});
      expect(nextStep).toBe('defendant-name-capture');

      // dispute-claim-interstitial should default to tenancy-details
      const nextStep2 = await getNextStep(mockReq, 'dispute-claim-interstitial', flowConfig, {});
      expect(nextStep2).toBe('tenancy-details');
    });

    it('should handle missing validatedCase in back navigation', async () => {
      const mockReq = {
        res: {
          locals: {},
        },
      } as unknown as Request;

      const formData = {
        'defendant-name-capture': { firstName: 'John', lastName: 'Doe' },
      };

      // Should still use function-based previousStep from formData
      const previousStep = await getPreviousStep(mockReq, 'defendant-date-of-birth', flowConfig, formData);
      expect(previousStep).toBe('defendant-name-capture');
    });
  });

  describe('Case data changes mid-journey', () => {
    it('should use current case data for forward navigation even if formData suggests different path', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                // Case data NOW shows England (maybe was Wales before)
                legislativeCountry: 'England',
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

      const formData = {
        // FormData suggests user visited landlord-registered (Wales path)
        'landlord-registered': { isRegistered: 'yes' },
      };

      // Forward navigation should use CURRENT case data (England)
      const nextStep = await getNextStep(mockReq, 'dispute-claim-interstitial', flowConfig, formData);
      expect(nextStep).toBe('tenancy-details'); // England route
    });

    it('should use formData for back button when case data changes mid-journey', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                // Case data NOW shows England (changed from Wales)
                legislativeCountry: 'England',
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

      const formData = {
        'landlord-registered': { isRegistered: 'yes' }, // User DID visit this (Wales path)
        'tenancy-details': { tenancyType: 'assured' },
      };

      // Back button should honor the path user ACTUALLY took
      // Even though current case data is England, user came from landlord-registered
      // Function-based previousStep checks formData, not current case data
      const previousStep = await getPreviousStep(mockReq, 'tenancy-details', flowConfig, formData);

      // CORRECT BEHAVIOR: Use formData (actual path taken), not re-evaluated conditions
      expect(previousStep).toBe('landlord-registered'); // Honors actual path via formData
    });
  });

  describe('Defendant name added mid-journey', () => {
    it('should route to confirmation if name becomes known after initial check', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                possessionClaimResponse: {
                  defendantContactDetails: {
                    party: {
                      // Name NOW known (maybe updated by caseworker)
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

      // Future navigation uses current data
      const nextStep = await getNextStep(mockReq, 'free-legal-advice', flowConfig, {});
      expect(nextStep).toBe('defendant-name-confirmation');
    });
  });

  describe('Empty formData', () => {
    it('should handle empty formData object gracefully', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      const emptyFormData = {};

      // Function-based previousStep should fallback when formData is empty
      const previousStep = await getPreviousStep(mockReq, 'defendant-date-of-birth', flowConfig, emptyFormData);
      // Without 'defendant-name-confirmation' in formData, should use capture
      expect(previousStep).toBe('defendant-name-capture');
    });

    it('should navigate forward with empty formData', async () => {
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
                      isRentArrears: 'No',
                    },
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const nextStep = await getNextStep(mockReq, 'dispute-claim-interstitial', flowConfig, {});
      expect(nextStep).toBe('landlord-registered');
    });
  });

  describe('Step not in stepOrder', () => {
    it('should return null for step not found in navigation', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      // Non-existent step
      const previousStep = await getPreviousStep(mockReq, 'non-existent-step', flowConfig, {});
      expect(previousStep).toBeNull();
    });
  });

  describe('Both conditional routes evaluate to same result', () => {
    it('should handle case where conditions resolve consistently', async () => {
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

      // Both conditions are clear: name known = true, Wales = true
      const step1 = await getNextStep(mockReq, 'free-legal-advice', flowConfig, {});
      expect(step1).toBe('defendant-name-confirmation');

      const step2 = await getNextStep(mockReq, 'dispute-claim-interstitial', flowConfig, {});
      expect(step2).toBe('landlord-registered');
    });
  });
});
