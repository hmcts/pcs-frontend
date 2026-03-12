import { Request } from 'express';

import { hasOnlyRentArrearsGrounds } from '../../../../main/steps/utils/hasOnlyRentArrearsGrounds';

describe('hasOnlyRentArrearsGrounds', () => {
  describe('when all grounds are rent arrears (rent-only)', () => {
    it('should return true when single ground has isRentArrears=Yes', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'Yes',
                      code: 'RENT_ARREARS_OR_BREACH_OF_TENANCY',
                    },
                    id: 'ground-1',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(true);
    });

    it('should return true when isRentArrears=YES (uppercase)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'YES',
                      code: 'RENT_ARREARS_OR_BREACH_OF_TENANCY',
                    },
                    id: 'ground-1',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(true);
    });

    it('should return true when isRentArrears=yes (lowercase)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'yes',
                    },
                    id: 'ground-1',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(true);
    });

    it('should return true when multiple grounds all have isRentArrears=Yes', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'Yes',
                      code: 'RENT_ARREARS_OR_BREACH_OF_TENANCY',
                    },
                    id: 'ground-1',
                  },
                  {
                    value: {
                      isRentArrears: 'Yes',
                      code: 'RENT_ARREARS_OR_BREACH_OF_TENANCY',
                    },
                    id: 'ground-2',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(true);
    });
  });

  describe('when some grounds are NOT rent arrears (mixed)', () => {
    it('should return false when one ground is rent arrears and another is not', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'Yes',
                      code: 'RENT_ARREARS_OR_BREACH_OF_TENANCY',
                    },
                    id: 'ground-1',
                  },
                  {
                    value: {
                      isRentArrears: 'No',
                      code: 'NUISANCE_OR_IMMORAL_USE',
                    },
                    id: 'ground-2',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false with multiple non-rent grounds', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'Yes',
                      code: 'RENT_ARREARS_OR_BREACH_OF_TENANCY',
                    },
                    id: 'ground-1',
                  },
                  {
                    value: {
                      isRentArrears: 'No',
                      code: 'NUISANCE_OR_IMMORAL_USE',
                    },
                    id: 'ground-2',
                  },
                  {
                    value: {
                      isRentArrears: 'No',
                      code: 'LANDLORDS_WORKS',
                    },
                    id: 'ground-3',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when first ground is non-rent and second is rent', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'No',
                      code: 'ANTISOCIAL_BEHAVIOUR',
                    },
                    id: 'ground-1',
                  },
                  {
                    value: {
                      isRentArrears: 'Yes',
                      code: 'RENT_ARREARS_OR_BREACH_OF_TENANCY',
                    },
                    id: 'ground-2',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });
  });

  describe('when NO grounds are rent arrears (non-rent only)', () => {
    it('should return false when no grounds have isRentArrears=Yes', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'No',
                      code: 'PREMIUM_PAID_MUTUAL_EXCHANGE',
                    },
                    id: 'ground-1',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false with multiple non-rent grounds only', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'No',
                      code: 'NUISANCE_OR_IMMORAL_USE',
                    },
                    id: 'ground-1',
                  },
                  {
                    value: {
                      isRentArrears: 'No',
                      code: 'DOMESTIC_VIOLENCE',
                    },
                    id: 'ground-2',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when isRentArrears is undefined', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      code: 'ANTISOCIAL_BEHAVIOUR',
                    },
                    id: 'ground-1',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when isRentArrears is null', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: null,
                      code: 'ANTISOCIAL_BEHAVIOUR',
                    },
                    id: 'ground-1',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false when claimGroundSummaries is empty array', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when claimGroundSummaries is undefined', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when claimGroundSummaries is null', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: null,
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when claimGroundSummaries is not an array', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: 'not-an-array',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when validatedCase is undefined', async () => {
      const mockReq = {
        res: {
          locals: {},
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when res.locals is undefined', async () => {
      const mockReq = {
        res: {},
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when res is undefined', async () => {
      const mockReq = {} as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when ground.value is undefined', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    id: 'ground-1',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when ground is null', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [null],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should handle mixed null/undefined grounds with valid rent arrears ground', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  null,
                  {
                    value: {
                      isRentArrears: 'Yes',
                      code: 'RENT_ARREARS_OR_BREACH_OF_TENANCY',
                    },
                    id: 'ground-1',
                  },
                  undefined,
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      // Should return false because not ALL grounds are rent arrears (null/undefined are not rent arrears)
      expect(result).toBe(false);
    });
  });

  describe('regression tests - verify against real CCD data', () => {
    it('should return true for scenario 1: rent-only, no notice (real CCD data)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      category: 'SECURE_OR_FLEXIBLE_DISCRETIONARY',
                      code: 'RENT_ARREARS_OR_BREACH_OF_TENANCY',
                      label: 'Rent arrears or breach of the tenancy (ground 1)',
                      isRentArrears: 'Yes',
                    },
                    id: '46c3fe9c-c786-4737-b565-a90ff33aef08',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(true);
    });

    it('should return false for scenario 4: mixed grounds (real CCD data)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      category: 'SECURE_OR_FLEXIBLE_DISCRETIONARY',
                      code: 'RENT_ARREARS_OR_BREACH_OF_TENANCY',
                      label: 'Rent arrears or breach of the tenancy (ground 1)',
                      reason: 'rent arrears reason',
                      isRentArrears: 'Yes',
                    },
                    id: 'ground-1',
                  },
                  {
                    value: {
                      category: 'SECURE_OR_FLEXIBLE_DISCRETIONARY_ALT',
                      code: 'ANTISOCIAL_BEHAVIOUR_S158',
                      label: 'Antisocial behaviour (ground 14)',
                      reason: 'antisocial behaviour reason',
                      isRentArrears: 'No',
                    },
                    id: 'ground-2',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      // Critical: Mixed grounds should return FALSE
      expect(result).toBe(false);
    });

    it('should return false for scenario 5: mixed grounds with 3 grounds (real CCD data)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      category: 'SECURE_OR_FLEXIBLE_DISCRETIONARY',
                      code: 'RENT_ARREARS_OR_BREACH_OF_TENANCY',
                      isRentArrears: 'Yes',
                    },
                    id: 'ground-1',
                  },
                  {
                    value: {
                      category: 'SECURE_OR_FLEXIBLE_DISCRETIONARY_ALT',
                      code: 'ANTISOCIAL_BEHAVIOUR_S158',
                      isRentArrears: 'No',
                    },
                    id: 'ground-2',
                  },
                  {
                    value: {
                      category: 'SECURE_OR_FLEXIBLE_DISCRETIONARY_ALT',
                      code: 'SPECIAL_NEEDS_ACCOMMODATION',
                      isRentArrears: 'No',
                    },
                    id: 'ground-3',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });

    it('should return false for scenario 7: non-rent-only (real CCD data)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      category: 'SECURE_OR_FLEXIBLE_DISCRETIONARY_ALT',
                      code: 'ANTISOCIAL_BEHAVIOUR_S157',
                      label: 'Antisocial behaviour (ground 2)',
                      isRentArrears: 'No',
                    },
                    id: 'ground-1',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      expect(result).toBe(false);
    });
  });

  describe('.every() and .some() method behavior verification', () => {
    it('should use .some() to check if at least one ground is rent arrears', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'No',
                      code: 'ANTISOCIAL_BEHAVIOUR',
                    },
                    id: 'ground-1',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      // No rent arrears at all - should return false
      expect(result).toBe(false);
    });

    it('should use .every() to verify ALL grounds are rent arrears', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'Yes',
                      code: 'RENT_ARREARS_OR_BREACH_OF_TENANCY',
                    },
                    id: 'ground-1',
                  },
                  {
                    value: {
                      isRentArrears: 'No', // This makes .every() return false
                      code: 'ANTISOCIAL_BEHAVIOUR',
                    },
                    id: 'ground-2',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await hasOnlyRentArrearsGrounds(mockReq);

      // Has rent arrears BUT not ALL are rent arrears - should return false
      expect(result).toBe(false);
    });
  });
});
