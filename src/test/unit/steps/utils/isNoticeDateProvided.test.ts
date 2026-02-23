import { Request } from 'express';

import { isNoticeDateProvided } from '../../../../main/steps/utils/isNoticeDateProvided';

describe('isNoticeDateProvided', () => {
  describe('when notice date is provided', () => {
    it('should return true when notice_NoticeHandedOverDateTime exists', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                notice_NoticeHandedOverDateTime: '2022-01-01T01:01:01',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(true);
    });

    it('should return true for different ISO date formats', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                notice_NoticeHandedOverDateTime: '2023-12-25T23:59:59',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(true);
    });

    it('should return true for date-only format (no time)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                notice_NoticeHandedOverDateTime: '2022-01-01',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(true);
    });
  });

  describe('when notice date is not provided', () => {
    it('should return false when notice_NoticeHandedOverDateTime is undefined', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when notice_NoticeHandedOverDateTime is null', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                notice_NoticeHandedOverDateTime: null,
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when notice_NoticeHandedOverDateTime is empty string', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                notice_NoticeHandedOverDateTime: '',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(false);
    });
  });

  describe('when CCD data is missing or incomplete', () => {
    it('should return false when validatedCase data is undefined', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {},
          },
        },
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when validatedCase is undefined', async () => {
      const mockReq = {
        res: {
          locals: {},
        },
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when res.locals is undefined', async () => {
      const mockReq = {
        res: {
          locals: undefined,
        },
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when res is undefined', async () => {
      const mockReq = {} as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(false);
    });
  });

  describe('regression tests - ensure CCD data path is correct', () => {
    it('should use req.res.locals.validatedCase.data path (not req.session.ccdCase)', async () => {
      // This test ensures we don't regress to using the old session path
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                notice_NoticeHandedOverDateTime: '2022-01-01T01:01:01', // Correct path - should be used
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      // Should use res.locals.validatedCase.data.notice_NoticeHandedOverDateTime
      expect(result).toBe(true);
    });

    it('should handle real CCD data structure from event-trigger-response', async () => {
      // Real data structure from /docs/callbacks/respondpossessionclaim/event-trigger-response-example.json
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              id: 1771456429013468,
              data: {
                noticeServed: 'Yes',
                rentArrears_Total: '22222200',
                legislativeCountry: 'England',
                notice_NoticeHandedOverDateTime: '2022-01-01T01:01:01',
                tenancy_TypeOfTenancyLicence: 'SECURE_TENANCY',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(true);
    });
  });
});
