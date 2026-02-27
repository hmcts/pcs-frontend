import { Request } from 'express';

import { isWelshProperty } from '../../../../main/steps/utils/isWelshProperty';

describe('isWelshProperty', () => {
  describe('when property is in Wales', () => {
    it('should return true when legislativeCountry is Wales (title case)', async () => {
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

      const result = await isWelshProperty(mockReq);

      expect(result).toBe(true);
    });

    it('should return true when legislativeCountry is WALES (uppercase - case insensitive)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'WALES',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isWelshProperty(mockReq);

      expect(result).toBe(true);
    });

    it('should return true when legislativeCountry is wales (lowercase - case insensitive)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                legislativeCountry: 'wales',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isWelshProperty(mockReq);

      expect(result).toBe(true);
    });
  });

  describe('when property is NOT in Wales', () => {
    it('should return false when legislativeCountry is England (title case)', async () => {
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

      const result = await isWelshProperty(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when legislativeCountry is undefined', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      const result = await isWelshProperty(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when validatedCase is undefined', async () => {
      const mockReq = {
        res: {
          locals: {},
        },
      } as unknown as Request;

      const result = await isWelshProperty(mockReq);

      expect(result).toBe(false);
    });
  });
});
