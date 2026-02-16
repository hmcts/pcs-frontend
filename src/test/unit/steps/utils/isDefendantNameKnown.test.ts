import { Request } from 'express';

import { isDefendantNameKnown } from '../../../../main/steps/utils/isDefendantNameKnown';

describe('isDefendantNameKnown', () => {
  describe('when defendant name is fully present in CCD', () => {
    it('should return true when nameKnown=YES and both firstName and lastName exist', async () => {
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

      const result = await isDefendantNameKnown(mockReq);

      expect(result).toBe(true);
    });
  });

  describe('when defendant name is missing or incomplete', () => {
    it('should return false when nameKnown=NO', async () => {
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

      const result = await isDefendantNameKnown(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when only firstName is present', async () => {
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
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isDefendantNameKnown(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when only lastName is present', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                possessionClaimResponse: {
                  defendantContactDetails: {
                    party: {
                      nameKnown: 'YES',
                      lastName: 'Doe',
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isDefendantNameKnown(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when defendantContactDetails is undefined', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                possessionClaimResponse: {},
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isDefendantNameKnown(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when validatedCase is undefined', async () => {
      const mockReq = {
        res: {
          locals: {},
        },
      } as unknown as Request;

      const result = await isDefendantNameKnown(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when names are empty strings', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                possessionClaimResponse: {
                  defendantContactDetails: {
                    party: {
                      nameKnown: 'YES',
                      firstName: '',
                      lastName: '',
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isDefendantNameKnown(mockReq);

      expect(result).toBe(false);
    });
  });
});
