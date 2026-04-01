import { Request } from 'express';

import { hasOnlyRentArrearsGrounds } from '../../../../main/steps/utils/hasOnlyRentArrearsGrounds';

describe('hasOnlyRentArrearsGrounds', () => {
  describe('when all grounds are rent arrears (rent-only)', () => {
    it('should return true when single ground has isRentArrears=Yes (case-insensitive)', async () => {
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
                      code: 'CRIMINAL_CONVICTION',
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
                      code: 'NUISANCE_OR_IMMORAL_USE',
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
                      code: 'CRIMINAL_CONVICTION',
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

    it('should handle mixed null/undefined grounds with valid rent arrears ground', async () => {
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
                    value: null,
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

  describe('regression tests - verify against real CCD data', () => {
    it('should return true for rent-only scenario (real CCD data)', async () => {
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
                      description: 'Rent arrears or breach of other obligation of the tenancy',
                    },
                    id: '4bd94bb9-e72f-473e-95ae-a6d2b3f8e8be',
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

    it('should return false for mixed grounds scenario (real CCD data)', async () => {
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
                      description: 'Rent arrears or breach of other obligation of the tenancy',
                    },
                    id: 'ground-1',
                  },
                  {
                    value: {
                      isRentArrears: 'No',
                      code: 'NUISANCE_OR_IMMORAL_USE',
                      description:
                        'Nuisance or annoyance to neighbours, illegal or immoral use of the property, or conviction for an arrestable offence in or near the property',
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

    it('should return false for non-rent-only scenario (real CCD data)', async () => {
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
                      description:
                        'Nuisance or annoyance to neighbours, illegal or immoral use of the property, or conviction for an arrestable offence in or near the property',
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
});
