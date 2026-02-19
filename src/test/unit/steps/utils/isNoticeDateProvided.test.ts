import { Request } from 'express';

import { isNoticeDateProvided } from '../../../../main/steps/utils/isNoticeDateProvided';

describe('isNoticeDateProvided', () => {
  describe('when notice date is provided', () => {
    it('should return true when notice_NoticeHandedOverDateTime exists', async () => {
      const mockReq = {
        session: {},
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

    it('should store notice date in session when provided', async () => {
      const mockSession = {};
      const mockReq = {
        session: mockSession,
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

      await isNoticeDateProvided(mockReq);

      expect(mockReq.session.noticeDate).toBe('2022-01-01T01:01:01');
    });

    it('should return true for different ISO date formats', async () => {
      const mockReq = {
        session: {},
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
      expect(mockReq.session.noticeDate).toBe('2023-12-25T23:59:59');
    });

    it('should return true for date-only format (no time)', async () => {
      const mockReq = {
        session: {},
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
      expect(mockReq.session.noticeDate).toBe('2022-01-01');
    });
  });

  describe('when notice date is not provided', () => {
    it('should return false when notice_NoticeHandedOverDateTime is undefined', async () => {
      const mockReq = {
        session: {},
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
        session: {},
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
        session: {},
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

    it('should not store date in session when not provided', async () => {
      const mockSession = {};
      const mockReq = {
        session: mockSession,
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      await isNoticeDateProvided(mockReq);

      expect(mockReq.session.noticeDate).toBeUndefined();
    });
  });

  describe('when CCD data is missing or incomplete', () => {
    it('should return false when validatedCase data is undefined', async () => {
      const mockReq = {
        session: {},
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
        session: {},
        res: {
          locals: {},
        },
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when res.locals is undefined', async () => {
      const mockReq = {
        session: {},
        res: {},
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when res is undefined', async () => {
      const mockReq = {
        session: {},
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      expect(result).toBe(false);
    });
  });

  describe('regression tests - ensure CCD data path is correct', () => {
    it('should use req.res.locals.validatedCase.data path (not req.session.ccdCase)', async () => {
      // This test ensures we don't regress to using the old session path
      const mockReq = {
        session: {
          ccdCase: {
            data: {
              notice_NoticeHandedOverDateTime: '2020-01-01T00:00:00', // Old path - should NOT be used
            },
          },
        },
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
      expect(mockReq.session.noticeDate).toBe('2022-01-01T01:01:01');
    });

    it('should handle real CCD data structure from event-trigger-response', async () => {
      // Real data structure from /docs/callbacks/respondpossessionclaim/event-trigger-response-example.json
      const mockReq = {
        session: {},
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
      expect(mockReq.session.noticeDate).toBe('2022-01-01T01:01:01');
    });

    it('should not be affected by old session data if CCD data is missing', async () => {
      const mockReq = {
        session: {
          noticeDate: '2020-01-01T00:00:00', // Old session value
          ccdCase: {
            data: {
              notice_NoticeHandedOverDateTime: '2020-01-01T00:00:00', // Old ccdCase value
            },
          },
        },
        res: {
          locals: {
            validatedCase: {
              data: {}, // No notice date in CCD
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeDateProvided(mockReq);

      // Should return false because CCD data doesn't have the date
      expect(result).toBe(false);
      // Session value should not be updated (keeps old value)
      expect(mockReq.session.noticeDate).toBe('2020-01-01T00:00:00');
    });
  });

  describe('session storage behavior', () => {
    it('should overwrite existing session noticeDate with new CCD value', async () => {
      const mockReq = {
        session: {
          noticeDate: '2020-01-01T00:00:00', // Old value
        },
        res: {
          locals: {
            validatedCase: {
              data: {
                notice_NoticeHandedOverDateTime: '2023-01-01T01:01:01', // New value
              },
            },
          },
        },
      } as unknown as Request;

      await isNoticeDateProvided(mockReq);

      expect(mockReq.session.noticeDate).toBe('2023-01-01T01:01:01');
    });

    it('should work with empty session object', async () => {
      const mockReq = {
        session: {}, // Session exists but is empty
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
      expect(mockReq.session.noticeDate).toBe('2022-01-01T01:01:01');
    });
  });
});
