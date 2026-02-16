import type { Request } from 'express';

import { getPreviousStep } from '../../../../main/modules/steps/flow';
import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

describe('Back Button Navigation', () => {
  describe('Linear steps with explicit previousStep', () => {
    it('should go back to correspondence-address from contact-preferences', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      const previousStep = await getPreviousStep(mockReq, 'contact-preferences', flowConfig, {});

      expect(previousStep).toBe('correspondence-address');
    });

    it('should go back to defendant-date-of-birth from correspondence-address', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      const previousStep = await getPreviousStep(mockReq, 'correspondence-address', flowConfig, {});

      expect(previousStep).toBe('defendant-date-of-birth');
    });
  });

  describe('Function-based previousStep - defendant-date-of-birth', () => {
    it('should go back to defendant-name-confirmation when that step is in formData', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      const formData = {
        'defendant-name-confirmation': { confirmed: 'yes' },
      };

      const previousStep = await getPreviousStep(mockReq, 'defendant-date-of-birth', flowConfig, formData);

      expect(previousStep).toBe('defendant-name-confirmation');
    });

    it('should go back to defendant-name-capture when confirmation is NOT in formData', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      const formData = {
        'defendant-name-capture': { firstName: 'John', lastName: 'Doe' },
      };

      const previousStep = await getPreviousStep(mockReq, 'defendant-date-of-birth', flowConfig, formData);

      expect(previousStep).toBe('defendant-name-capture');
    });
  });

  describe('Auto-calculated previousStep - tenancy-details (critical test)', () => {
    it('should go back to landlord-registered when user visited it (Welsh property path)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'Wales',
              },
            },
          },
        },
      } as unknown as Request;

      const formData = {
        'dispute-claim-interstitial': { understood: 'yes' },
        'landlord-registered': { isRegistered: 'yes' },
        'tenancy-details': { tenancyType: 'assured' },
      };

      const previousStep = await getPreviousStep(mockReq, 'tenancy-details', flowConfig, formData);

      expect(previousStep).toBe('landlord-registered');
    });

    it('should go back to dispute-claim-interstitial when landlord-registered was skipped (English property)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'England',
              },
            },
          },
        },
      } as unknown as Request;

      const formData = {
        'dispute-claim-interstitial': { understood: 'yes' },
        'tenancy-details': { tenancyType: 'assured' },
      };

      const previousStep = await getPreviousStep(mockReq, 'tenancy-details', flowConfig, formData);

      expect(previousStep).toBe('dispute-claim-interstitial');
    });
  });

  describe('Back button for all 4 journey paths', () => {
    it('should handle back navigation for Path A (England + Name Known)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'England',
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

      const formData = {
        'defendant-name-confirmation': { confirmed: 'yes' },
      };

      // Back from defendant-date-of-birth
      const prev1 = await getPreviousStep(mockReq, 'defendant-date-of-birth', flowConfig, formData);
      expect(prev1).toBe('defendant-name-confirmation');

      // Back from tenancy-details
      const prev2 = await getPreviousStep(mockReq, 'tenancy-details', flowConfig, {});
      expect(prev2).toBe('dispute-claim-interstitial');
    });

    it('should handle back navigation for Path B (England + Name Unknown)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'England',
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

      const formData = {
        'defendant-name-capture': { firstName: 'John', lastName: 'Doe' },
      };

      // Back from defendant-date-of-birth
      const prev1 = await getPreviousStep(mockReq, 'defendant-date-of-birth', flowConfig, formData);
      expect(prev1).toBe('defendant-name-capture');

      // Back from tenancy-details
      const prev2 = await getPreviousStep(mockReq, 'tenancy-details', flowConfig, {});
      expect(prev2).toBe('dispute-claim-interstitial');
    });

    it('should handle back navigation for Path C (Wales + Name Known)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'Wales',
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

      const formData = {
        'defendant-name-confirmation': { confirmed: 'yes' },
      };

      // Back from defendant-date-of-birth
      const prev1 = await getPreviousStep(mockReq, 'defendant-date-of-birth', flowConfig, formData);
      expect(prev1).toBe('defendant-name-confirmation');

      // Back from tenancy-details (Wales - user visited landlord-registered)
      const formDataWithLandlord = {
        'landlord-registered': { isRegistered: 'yes' },
      };
      const prev2 = await getPreviousStep(mockReq, 'tenancy-details', flowConfig, formDataWithLandlord);
      expect(prev2).toBe('landlord-registered');
    });

    it('should handle back navigation for Path D (Wales + Name Unknown)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'Wales',
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

      const formData = {
        'defendant-name-capture': { firstName: 'John', lastName: 'Doe' },
      };

      // Back from defendant-date-of-birth
      const prev1 = await getPreviousStep(mockReq, 'defendant-date-of-birth', flowConfig, formData);
      expect(prev1).toBe('defendant-name-capture');

      // Back from tenancy-details (Wales - user visited landlord-registered)
      const formDataWithLandlord = {
        'landlord-registered': { isRegistered: 'yes' },
      };
      const prev2 = await getPreviousStep(mockReq, 'tenancy-details', flowConfig, formDataWithLandlord);
      expect(prev2).toBe('landlord-registered');
    });
  });

  describe('Steporder fallback when no explicit previousStep', () => {
    it('should use stepOrder array as fallback', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'England',
              },
            },
          },
        },
      } as unknown as Request;

      // landlord-registered has explicit defaultNext but tenancy-details doesn't have explicit previousStep
      // so it should use auto-calculation which checks routes
      const previousStep = await getPreviousStep(mockReq, 'counter-claim', flowConfig, {});

      expect(previousStep).toBe('tenancy-details');
    });
  });

  describe('First step - no previous', () => {
    it('should return null for first step in journey', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      const previousStep = await getPreviousStep(mockReq, 'start-now', flowConfig, {});

      expect(previousStep).toBeNull();
    });
  });

  describe('Back navigation with conditional routes', () => {
    it('should correctly identify previous step from conditional routes - name known case', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
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

      // If on defendant-name-confirmation, previous should be free-legal-advice
      // because condition for that route would be true
      const previousStep = await getPreviousStep(mockReq, 'defendant-name-confirmation', flowConfig, {});

      expect(previousStep).toBe('free-legal-advice');
    });

    it('should correctly identify previous step from conditional routes - name unknown case', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
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

      // If on defendant-name-capture, previous should be free-legal-advice
      const previousStep = await getPreviousStep(mockReq, 'defendant-name-capture', flowConfig, {});

      expect(previousStep).toBe('free-legal-advice');
    });

    it('should correctly identify previous step for landlord-registered (Welsh property)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'Wales',
              },
            },
          },
        },
      } as unknown as Request;

      const previousStep = await getPreviousStep(mockReq, 'landlord-registered', flowConfig, {});

      expect(previousStep).toBe('dispute-claim-interstitial');
    });
  });
});
