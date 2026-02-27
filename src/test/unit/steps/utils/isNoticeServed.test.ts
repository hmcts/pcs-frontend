import { Request } from 'express';

import { isNoticeServed } from '../../../../main/steps/utils/isNoticeServed';

describe('isNoticeServed', () => {
  describe('when notice was served (noticeServed = "Yes")', () => {
    it('should return true when noticeServed is "Yes"', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                noticeServed: 'Yes',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeServed(mockReq);

      expect(result).toBe(true);
    });

    it('should return true when noticeServed is "YES" (uppercase)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                noticeServed: 'YES',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeServed(mockReq);

      expect(result).toBe(true);
    });

    it('should return true when noticeServed is "yes" (lowercase)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                noticeServed: 'yes',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeServed(mockReq);

      expect(result).toBe(true);
    });

    it('should return true when noticeServed is "YeS" (mixed case)', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                noticeServed: 'YeS',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeServed(mockReq);

      expect(result).toBe(true);
    });
  });

  describe('when notice was not served (noticeServed = "No")', () => {
    it('should return false when noticeServed is "No"', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                noticeServed: 'No',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeServed(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when noticeServed is empty string', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {
                noticeServed: '',
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeServed(mockReq);

      expect(result).toBe(false);
    });
  });

  describe('when CCD data is missing or incomplete', () => {
    it('should return false when noticeServed is undefined', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {
              data: {},
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeServed(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when validatedCase data is undefined', async () => {
      const mockReq = {
        res: {
          locals: {
            validatedCase: {},
          },
        },
      } as unknown as Request;

      const result = await isNoticeServed(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when validatedCase is undefined', async () => {
      const mockReq = {
        res: {
          locals: {},
        },
      } as unknown as Request;

      const result = await isNoticeServed(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when res.locals is undefined', async () => {
      const mockReq = {
        res: {},
      } as unknown as Request;

      const result = await isNoticeServed(mockReq);

      expect(result).toBe(false);
    });

    it('should return false when res is undefined', async () => {
      const mockReq = {} as unknown as Request;

      const result = await isNoticeServed(mockReq);

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
              noticeServed: 'Yes', // Old path - should NOT be used
            },
          },
        },
        res: {
          locals: {
            validatedCase: {
              data: {
                noticeServed: 'No', // Correct path - should be used
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeServed(mockReq);

      // Should use res.locals.validatedCase.data.noticeServed ("No")
      // NOT session.ccdCase.data.noticeServed ("Yes")
      expect(result).toBe(false);
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
              },
            },
          },
        },
      } as unknown as Request;

      const result = await isNoticeServed(mockReq);

      expect(result).toBe(true);
    });
  });
});
