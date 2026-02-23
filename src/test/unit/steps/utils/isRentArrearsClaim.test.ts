import { Request } from 'express';

import { isRentArrearsClaim } from '../../../../main/steps/utils/isRentArrearsClaim';

describe('isRentArrearsClaim', () => {
  describe('when claim includes rent arrears', () => {
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

      const result = await isRentArrearsClaim(mockReq);

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
                    },
                    id: 'ground-1',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isRentArrearsClaim(mockReq);

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

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(true);
    });

    it('should return true when isRentArrears=YeS (mixed case)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'YeS',
                    },
                    id: 'ground-1',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(true);
    });

    it('should return true when multiple grounds with one having isRentArrears=Yes', async () => {
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
                  {
                    value: {
                      isRentArrears: 'No',
                      code: 'SPECIAL_NEEDS_ACCOMMODATION',
                    },
                    id: 'ground-3',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isRentArrearsClaim(mockReq);

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

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(true);
    });
  });

  describe('when claim does NOT include rent arrears', () => {
    it('should return false when single ground has isRentArrears=No', async () => {
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

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when all grounds have isRentArrears=No', async () => {
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
                      isRentArrears: 'No',
                      code: 'SPECIAL_NEEDS_ACCOMMODATION',
                    },
                    id: 'ground-2',
                  },
                  {
                    value: {
                      isRentArrears: 'No',
                      code: 'CRIMINAL_BEHAVIOUR',
                    },
                    id: 'ground-3',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isRentArrearsClaim(mockReq);

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

      const result = await isRentArrearsClaim(mockReq);

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

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when isRentArrears is empty string', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: '',
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

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when isRentArrears has invalid value', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'Maybe',
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

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });
  });

  describe('when claimGroundSummaries is missing or invalid', () => {
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

      const result = await isRentArrearsClaim(mockReq);

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

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });

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

      const result = await isRentArrearsClaim(mockReq);

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

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when claimGroundSummaries is an object', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: { value: { isRentArrears: 'Yes' } },
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });
  });

  describe('when CCD data structure is missing or incomplete', () => {
    it('should return false when validatedCase.data is undefined', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {},
          },
        },
      } as unknown as Request;

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when validatedCase is undefined', async () => {
      const mockReq = {
        res: {
          locals: {},
        },
      } as unknown as Request;

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when res.locals is undefined', async () => {
      const mockReq = {
        res: {},
      } as unknown as Request;

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when res is undefined', async () => {
      const mockReq = {} as unknown as Request;

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });
  });

  describe('edge cases with ground.value missing', () => {
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

      const result = await isRentArrearsClaim(mockReq);

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

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when ground is undefined', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [undefined],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });

    it('should skip null/undefined grounds and return true if valid ground has isRentArrears=Yes', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  null,
                  undefined,
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

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(true);
    });
  });

  describe('regression tests - verify CCD data path', () => {
    it('should use req.res.locals.validatedCase.data path (START callback data)', async () => {
      // Ensure we read from the correct CCD path (START callback response)
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
                    id: '46c3fe9c-c786-4737-b565-a90ff33aef08',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(true);
    });

    it('should handle real CCD data structure from test file #1', async () => {
      // Based on start-callback-england-notice-yes-rent-arrears-single-ground.json
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              id: 1771777994911210,
              data: {
                rentArrears_Total: '122200',
                noticeServed: 'Yes',
                legislativeCountry: 'England',
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

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(true);
    });

    it('should handle real CCD data structure from test file #2 (multi-ground)', async () => {
      // Based on start-callback-england-notice-yes-rent-arrears-multi-ground.json
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
                  {
                    value: {
                      category: 'SECURE_OR_FLEXIBLE_DISCRETIONARY_ALT',
                      code: 'SPECIAL_NEEDS_ACCOMMODATION',
                      label: 'Special needs accommodation (ground 15)',
                      reason: 'special needs reason',
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

      const result = await isRentArrearsClaim(mockReq);

      // Should return true because ground-1 has isRentArrears: 'Yes'
      expect(result).toBe(true);
    });

    it('should handle real CCD data structure from test file #3 (non-rent arrears)', async () => {
      // Based on start-callback-wales-no-notice-non-rent-arrears-single-ground.json
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'Wales',
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

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });
  });

  describe('.some() method behavior verification', () => {
    it('should use .some() to return true on FIRST matching ground (short-circuit)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                claimGroundSummaries: [
                  {
                    value: {
                      isRentArrears: 'Yes', // First match - .some() should stop here
                      code: 'RENT_ARREARS_OR_BREACH_OF_TENANCY',
                    },
                    id: 'ground-1',
                  },
                  {
                    value: {
                      isRentArrears: 'No',
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

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(true);
    });

    it('should use .some() to return false when NO grounds match', async () => {
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
                      isRentArrears: 'No',
                      code: 'SPECIAL_NEEDS_ACCOMMODATION',
                    },
                    id: 'ground-2',
                  },
                  {
                    value: {
                      isRentArrears: 'No',
                      code: 'CRIMINAL_BEHAVIOUR',
                    },
                    id: 'ground-3',
                  },
                ],
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isRentArrearsClaim(mockReq);

      expect(result).toBe(false);
    });
  });
});
