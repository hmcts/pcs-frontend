jest.mock('../../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseByIdForEvent: jest.fn(),
    updateDraft: jest.fn(),
  },
}));

import type { Request } from 'express';

import { createCcdDraftStorage, sessionDocs, toDisplayDocuments } from '../../../../main/modules/documents/storage';

import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';

const mockGetCaseByIdForEvent = ccdCaseService.getCaseByIdForEvent as jest.Mock;
const mockUpdateDraft = ccdCaseService.updateDraft as jest.Mock;

const doc1: CcdCollectionItem<CcdUploadedDocument> = {
  id: 'id-1',
  value: {
    document: {
      document_url: 'http://dm/doc/1',
      document_binary_url: 'http://dm/doc/1/binary',
      document_filename: 'file1.pdf',
    },
    contentType: 'application/pdf',
    sizeInBytes: 1024,
  },
};

const doc2: CcdCollectionItem<CcdUploadedDocument> = {
  id: 'id-2',
  value: {
    document: {
      document_url: 'http://dm/doc/2',
      document_binary_url: 'http://dm/doc/2/binary',
      document_filename: 'file2.pdf',
    },
    contentType: 'application/pdf',
    sizeInBytes: 2048,
  },
};

const VALID_CASE_REF = '1234567890123456';

function makeReq(overrides: Record<string, unknown> = {}): Request {
  return {
    session: { user: { accessToken: 'test-token' } },
    params: { caseReference: VALID_CASE_REF },
    res: { locals: {} },
    ...overrides,
  } as unknown as Request;
}

const EVENT = { id: 'respondPossessionClaim', pageId: 'respondToPossessionDraftSavePage' };

describe('createCcdDraftStorage', () => {
  const storage = createCcdDraftStorage({
    event: EVENT,
    getDocs: data => data.possessionClaimResponse?.defendantResponses?.defendantDocuments ?? [],
    setDocs: docs => ({ possessionClaimResponse: { defendantResponses: { defendantDocuments: docs } } }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateDraft.mockResolvedValue({ id: VALID_CASE_REF, data: {} });
  });

  describe('read', () => {
    it('returns docs from res.locals.validatedCase.data at the configured path', async () => {
      const req = makeReq({
        res: {
          locals: {
            validatedCase: {
              data: {
                possessionClaimResponse: {
                  defendantResponses: { defendantDocuments: [doc1] },
                },
              },
            },
          },
        },
      });

      const result = await storage.read(req);

      expect(result).toEqual([doc1]);
      expect(mockGetCaseByIdForEvent).not.toHaveBeenCalled();
    });

    it('returns empty array when path does not exist in validatedCase', async () => {
      const req = makeReq({ res: { locals: { validatedCase: { data: {} } } } });

      const result = await storage.read(req);

      expect(result).toEqual([]);
    });

    it('returns empty array when validatedCase is absent', async () => {
      const req = makeReq({ res: { locals: {} } });

      const result = await storage.read(req);

      expect(result).toEqual([]);
    });
  });

  describe('readFresh', () => {
    it('calls getCaseById with configured event id and returns docs at path', async () => {
      mockGetCaseByIdForEvent.mockResolvedValue({
        id: VALID_CASE_REF,
        data: {
          possessionClaimResponse: {
            defendantResponses: { defendantDocuments: [doc1, doc2] },
          },
        },
      });

      const req = makeReq();
      const result = await storage.readFresh(req);

      expect(mockGetCaseByIdForEvent).toHaveBeenCalledWith('test-token', VALID_CASE_REF, EVENT.id);
      expect(result).toEqual([doc1, doc2]);
    });

    it('returns empty array when path not present in fresh response', async () => {
      mockGetCaseByIdForEvent.mockResolvedValue({ id: VALID_CASE_REF, data: {} });

      const result = await storage.readFresh(makeReq());

      expect(result).toEqual([]);
    });

    it('throws when user has no access token', async () => {
      const req = makeReq({ session: {} });

      await expect(storage.readFresh(req)).rejects.toThrow('User not authenticated');
    });

    it('throws 404 when case reference is not 16 digits', async () => {
      const req = makeReq({ params: { caseReference: 'not-a-case-id' } });

      await expect(storage.readFresh(req)).rejects.toThrow('Invalid case reference format');
      expect(mockGetCaseByIdForEvent).not.toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('calls updateDraft with setDocs-wrapped docs at configured path', async () => {
      const req = makeReq();
      await storage.save(req, [doc1, doc2]);

      expect(mockUpdateDraft).toHaveBeenCalledWith(EVENT, 'test-token', VALID_CASE_REF, {
        possessionClaimResponse: {
          defendantResponses: { defendantDocuments: [doc1, doc2] },
        },
      });
    });

    it('throws when user has no access token', async () => {
      const req = makeReq({ session: {} });

      await expect(storage.save(req, [])).rejects.toThrow('User not authenticated');
    });

    it('throws 404 when case reference is not 16 digits', async () => {
      const req = makeReq({ params: { caseReference: '123' } });

      await expect(storage.save(req, [])).rejects.toThrow('Invalid case reference format');
      expect(mockUpdateDraft).not.toHaveBeenCalled();
    });
  });
});

describe('sessionDocs', () => {
  const STEP_NAME = 'upload-documents-to-support-your-application';
  const OTHER_CASE_REF = '9999999999999999';
  const storage = sessionDocs({ stepName: STEP_NAME });

  function makeSessionReq(docs?: CcdCollectionItem<CcdUploadedDocument>[], caseRef: string = VALID_CASE_REF): Request {
    return {
      params: { caseReference: caseRef },
      session: {
        uploadedDocs: docs ? { [caseRef]: { [STEP_NAME]: docs } } : undefined,
        reload: jest.fn((cb: (err: null) => void) => cb(null)),
        save: jest.fn((cb: (err: null) => void) => cb(null)),
      },
    } as unknown as Request;
  }

  describe('read', () => {
    it('returns docs from the dedicated uploadedDocs bucket without reloading', async () => {
      const req = makeSessionReq([doc1]);

      const result = await storage.read(req);

      expect(result).toEqual([doc1]);
      expect(req.session.reload as jest.Mock).not.toHaveBeenCalled();
    });

    it('returns empty array when uploadedDocs bucket is absent', async () => {
      const req = makeSessionReq();

      expect(await storage.read(req)).toEqual([]);
    });

    it('returns empty array when bucket value is not an array', async () => {
      const req = {
        params: { caseReference: VALID_CASE_REF },
        session: {
          uploadedDocs: {
            [VALID_CASE_REF]: { [STEP_NAME]: '' as unknown as CcdCollectionItem<CcdUploadedDocument>[] },
          },
          reload: jest.fn(),
          save: jest.fn(),
        },
      } as unknown as Request;

      expect(await storage.read(req)).toEqual([]);
    });

    it('throws 404 when caseReference is missing', async () => {
      const req = {
        params: {},
        session: {
          uploadedDocs: { [VALID_CASE_REF]: { [STEP_NAME]: [doc1] } },
          reload: jest.fn(),
          save: jest.fn(),
        },
      } as unknown as Request;

      await expect(storage.read(req)).rejects.toThrow('Invalid case reference format');
    });

    it('does not leak docs from a different case in the same session', async () => {
      const req = {
        params: { caseReference: OTHER_CASE_REF },
        session: {
          uploadedDocs: { [VALID_CASE_REF]: { [STEP_NAME]: [doc1, doc2] } },
          reload: jest.fn(),
          save: jest.fn(),
        },
      } as unknown as Request;

      expect(await storage.read(req)).toEqual([]);
    });
  });

  describe('readFresh', () => {
    it('reloads session before reading', async () => {
      const req = makeSessionReq([doc1]);

      const result = await storage.readFresh(req);

      expect(req.session.reload as jest.Mock).toHaveBeenCalledTimes(1);
      expect(result).toEqual([doc1]);
    });

    it('rejects when session reload fails', async () => {
      const req = {
        params: { caseReference: VALID_CASE_REF },
        session: {
          uploadedDocs: {},
          reload: jest.fn((cb: (err: Error) => void) => cb(new Error('Redis down'))),
          save: jest.fn(),
        },
      } as unknown as Request;

      await expect(storage.readFresh(req)).rejects.toThrow('Redis down');
    });
  });

  describe('save', () => {
    it('writes docs into the dedicated uploadedDocs bucket and calls session.save', async () => {
      const req = makeSessionReq();

      await storage.save(req, [doc1, doc2]);

      expect(req.session.uploadedDocs?.[VALID_CASE_REF]?.[STEP_NAME]).toEqual([doc1, doc2]);
      expect(req.session.save as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('does not overwrite another case bucket when saving for a different case', async () => {
      const req = {
        params: { caseReference: OTHER_CASE_REF },
        session: {
          uploadedDocs: { [VALID_CASE_REF]: { [STEP_NAME]: [doc1] } },
          reload: jest.fn(),
          save: jest.fn((cb: (err: null) => void) => cb(null)),
        },
      } as unknown as Request;

      await storage.save(req, [doc2]);

      expect(req.session.uploadedDocs?.[VALID_CASE_REF]?.[STEP_NAME]).toEqual([doc1]);
      expect(req.session.uploadedDocs?.[OTHER_CASE_REF]?.[STEP_NAME]).toEqual([doc2]);
    });

    it('throws 404 when case reference is not 16 digits', async () => {
      const req = makeSessionReq(undefined, 'not-a-case-id');

      await expect(storage.save(req, [doc1])).rejects.toThrow('Invalid case reference format');
      expect(req.session.save as jest.Mock).not.toHaveBeenCalled();
    });

    it('rejects when session save fails', async () => {
      const req = {
        params: { caseReference: VALID_CASE_REF },
        session: {
          uploadedDocs: {},
          reload: jest.fn(),
          save: jest.fn((cb: (err: Error) => void) => cb(new Error('save failed'))),
        },
      } as unknown as Request;

      await expect(storage.save(req, [])).rejects.toThrow('save failed');
    });
  });
});

describe('toDisplayDocuments', () => {
  it('maps collection items to display format with sequential indexes', () => {
    const result = toDisplayDocuments([doc1, doc2]);

    expect(result).toEqual([
      { index: 0, id: 'id-1', document_filename: 'file1.pdf', content_type: 'application/pdf', sizeInBytes: 1024 },
      { index: 1, id: 'id-2', document_filename: 'file2.pdf', content_type: 'application/pdf', sizeInBytes: 2048 },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(toDisplayDocuments([])).toEqual([]);
  });

  it('returns empty array when input is not an array (defensive)', () => {
    expect(toDisplayDocuments(undefined as unknown as CcdCollectionItem<CcdUploadedDocument>[])).toEqual([]);
    expect(toDisplayDocuments('' as unknown as CcdCollectionItem<CcdUploadedDocument>[])).toEqual([]);
  });

  it('handles missing optional fields (contentType, sizeInBytes)', () => {
    const doc: CcdCollectionItem<CcdUploadedDocument> = {
      id: 'id-x',
      value: {
        document: {
          document_url: 'http://dm/doc/x',
          document_binary_url: 'http://dm/doc/x/binary',
          document_filename: 'nodoc.pdf',
        },
      } as CcdUploadedDocument,
    };

    const result = toDisplayDocuments([doc]);

    expect(result[0].document_filename).toBe('nodoc.pdf');
    expect(result[0].content_type).toBeUndefined();
    expect(result[0].sizeInBytes).toBeUndefined();
  });
});
