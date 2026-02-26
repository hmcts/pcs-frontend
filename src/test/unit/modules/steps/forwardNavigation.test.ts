import type { Request } from 'express';

import { getNextStep } from '../../../../main/modules/steps/flow';
import { flowConfig } from '../../../../main/steps/respond-to-claim/flow.config';

describe('Forward Navigation - Conditional Routing', () => {
  describe('free-legal-advice → defendant name routing', () => {
    it('should route to defendant-name-confirmation when defendant name is known', async () => {
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

      const nextStep = await getNextStep(mockReq, 'free-legal-advice', flowConfig, {});

      expect(nextStep).toBe('defendant-name-confirmation');
    });

    it('should route to defendant-name-capture when defendant name is unknown', async () => {
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

      const nextStep = await getNextStep(mockReq, 'free-legal-advice', flowConfig, {});

      expect(nextStep).toBe('defendant-name-capture');
    });

    it('should use defaultNext when defendant data is missing', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      const nextStep = await getNextStep(mockReq, 'free-legal-advice', flowConfig, {});

      expect(nextStep).toBe('defendant-name-capture');
    });
  });

  describe('dispute-claim-interstitial → Welsh property routing', () => {
    it('should route to landlord-registered when property is in Wales', async () => {
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

      const nextStep = await getNextStep(mockReq, 'dispute-claim-interstitial', flowConfig, {});

      expect(nextStep).toBe('landlord-registered');
    });

    it.skip('should route to tenancy-details when property is in England', async () => {
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

      const nextStep = await getNextStep(mockReq, 'dispute-claim-interstitial', flowConfig, {});

      expect(nextStep).toBe('tenancy-details');
    });

    it.skip('should use defaultNext (tenancy-details) when legislativeCountry is missing', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      const nextStep = await getNextStep(mockReq, 'dispute-claim-interstitial', flowConfig, {});

      expect(nextStep).toBe('tenancy-details');
    });
  });

  describe.skip('All 4 journey path combinations', () => {
    it('should handle Path A: England + Name Known', async () => {
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

      const step1 = await getNextStep(mockReq, 'free-legal-advice', flowConfig, {});
      expect(step1).toBe('defendant-name-confirmation');

      const step2 = await getNextStep(mockReq, 'dispute-claim-interstitial', flowConfig, {});
      expect(step2).toBe('tenancy-details');
    });

    it('should handle Path B: England + Name Unknown', async () => {
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

      const step1 = await getNextStep(mockReq, 'free-legal-advice', flowConfig, {});
      expect(step1).toBe('defendant-name-capture');

      const step2 = await getNextStep(mockReq, 'dispute-claim-interstitial', flowConfig, {});
      expect(step2).toBe('tenancy-details');
    });

    it('should handle Path C: Wales + Name Known', async () => {
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

      const step1 = await getNextStep(mockReq, 'free-legal-advice', flowConfig, {});
      expect(step1).toBe('defendant-name-confirmation');

      const step2 = await getNextStep(mockReq, 'dispute-claim-interstitial', flowConfig, {});
      expect(step2).toBe('landlord-registered');
    });

    it('should handle Path D: Wales + Name Unknown', async () => {
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

      const step1 = await getNextStep(mockReq, 'free-legal-advice', flowConfig, {});
      expect(step1).toBe('defendant-name-capture');

      const step2 = await getNextStep(mockReq, 'dispute-claim-interstitial', flowConfig, {});
      expect(step2).toBe('landlord-registered');
    });
  });

  describe('Linear steps (non-conditional)', () => {
    it('should use defaultNext for steps with no conditional routing', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      const nextStep = await getNextStep(mockReq, 'defendant-name-confirmation', flowConfig, {});

      expect(nextStep).toBe('defendant-date-of-birth');
    });
  });
});
