import { Request } from 'express';

import { CcdCaseModel } from '../../../../main/interfaces/ccdCaseData.model';
import { isDefendantNameKnown } from '../../../../main/steps/utils/isDefendantNameKnown';

describe('isDefendantNameKnown', () => {
  describe('when defendant name is fully present in CCD', () => {
    it('should return true when nameKnown=YES and both firstName and lastName exist', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: new CcdCaseModel({
              id: '',
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
            }),
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
            validatedCase: new CcdCaseModel({
              id: '',
              data: {
                possessionClaimResponse: {
                  defendantContactDetails: {
                    party: {
                      nameKnown: 'NO',
                    },
                  },
                },
              },
            }),
          },
        },
      } as unknown as Request;

      const result = await isDefendantNameKnown(mockReq);

      expect(result).toBe(false);
    });

    it('should return true when nameKnown=YES even if only firstName is present', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: new CcdCaseModel({
              id: '',
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
            }),
          },
        },
      } as unknown as Request;

      const result = await isDefendantNameKnown(mockReq);

      expect(result).toBe(true);
    });

    it('should return true when nameKnown=YES even if only lastName is present', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: new CcdCaseModel({
              id: '',
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
            }),
          },
        },
      } as unknown as Request;

      const result = await isDefendantNameKnown(mockReq);

      expect(result).toBe(true);
    });

    it('should return false when defendantContactDetails is undefined', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: new CcdCaseModel({
              id: '',
              data: {
                possessionClaimResponse: {},
              },
            }),
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

    it('should return true when nameKnown=YES even if names are empty strings', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: new CcdCaseModel({
              id: '',
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
            }),
          },
        },
      } as unknown as Request;

      const result = await isDefendantNameKnown(mockReq);

      expect(result).toBe(true);
    });
  });
});
