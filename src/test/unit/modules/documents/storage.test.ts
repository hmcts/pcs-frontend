jest.mock('../../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
    updateDraft: jest.fn(),
  },
}));

import type { Request } from 'express';

import { createCcdDraftStorage, sessionDocs, toDisplayDocuments } from '../../../../main/modules/documents/storage';

import type { CcdCollectionItem, CcdUploadedDocument } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';

const mockGetCaseById = ccdCaseService.getCaseById as jest.Mock;
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
    size: 1024,
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
    size: 2048,
  },
};

function makeReq(overrides: Record<string, unknown> = {}): Request {
  return {
    session: { user: { accessToken: 'test-token' } },
    params: { caseReference: 'case-123' },
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
    mockUpdateDraft.mockResolvedValue({ id: 'case-123', data: {} });
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
      expect(mockGetCaseById).not.toHaveBeenCalled();
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
      mockGetCaseById.mockResolvedValue({
        id: 'case-123',
        data: {
          possessionClaimResponse: {
            defendantResponses: { defendantDocuments: [doc1, doc2] },
          },
        },
      });

      const req = makeReq();
      const result = await storage.readFresh(req);

      expect(mockGetCaseById).toHaveBeenCalledWith('test-token', 'case-123', EVENT.id);
      expect(result).toEqual([doc1, doc2]);
    });

    it('returns empty array when path not present in fresh response', async () => {
      mockGetCaseById.mockResolvedValue({ id: 'case-123', data: {} });

      const result = await storage.readFresh(makeReq());

      expect(result).toEqual([]);
    });

    it('throws when user has no access token', async () => {
      const req = makeReq({ session: {} });

      await expect(storage.readFresh(req)).rejects.toThrow('User not authenticated');
    });
  });

  describe('save', () => {
    it('calls updateDraft with setDocs-wrapped docs at configured path', async () => {
      const req = makeReq();
      await storage.save(req, [doc1, doc2]);

      expect(mockUpdateDraft).toHaveBeenCalledWith(EVENT, 'test-token', 'case-123', {
        possessionClaimResponse: {
          defendantResponses: { defendantDocuments: [doc1, doc2] },
        },
      });
    });

    it('throws when user has no access token', async () => {
      const req = makeReq({ session: {} });

      await expect(storage.save(req, [])).rejects.toThrow('User not authenticated');
    });
  });
});

describe('sessionDocs', () => {
  const STEP_NAME = 'upload-documents-to-support-your-application';
  const storage = sessionDocs({ stepName: STEP_NAME });

  function makeSessionReq(docs?: CcdCollectionItem<CcdUploadedDocument>[]): Request {
    return {
      session: {
        formData: docs ? { [STEP_NAME]: { documents: docs } } : {},
        reload: jest.fn((cb: (err: null) => void) => cb(null)),
        save: jest.fn((cb: (err: null) => void) => cb(null)),
      },
    } as unknown as Request;
  }

  describe('read', () => {
    it('returns docs from session formData without reloading', async () => {
      const req = makeSessionReq([doc1]);

      const result = await storage.read(req);

      expect(result).toEqual([doc1]);
      expect(req.session.reload as jest.Mock).not.toHaveBeenCalled();
    });

    it('returns empty array when formData is absent', async () => {
      const req = makeSessionReq();

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
        session: {
          formData: {},
          reload: jest.fn((cb: (err: Error) => void) => cb(new Error('Redis down'))),
          save: jest.fn(),
        },
      } as unknown as Request;

      await expect(storage.readFresh(req)).rejects.toThrow('Redis down');
    });
  });

  describe('save', () => {
    it('writes docs to session and calls session.save', async () => {
      const req = makeSessionReq();

      await storage.save(req, [doc1, doc2]);

      expect(req.session.formData?.[STEP_NAME]).toEqual({ documents: [doc1, doc2] });
      expect(req.session.save as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('rejects when session save fails', async () => {
      const req = {
        session: {
          formData: {},
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
      { index: 0, id: 'id-1', document_filename: 'file1.pdf', content_type: 'application/pdf', size: 1024 },
      { index: 1, id: 'id-2', document_filename: 'file2.pdf', content_type: 'application/pdf', size: 2048 },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(toDisplayDocuments([])).toEqual([]);
  });

  it('handles missing optional fields (contentType, size)', () => {
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
    expect(result[0].size).toBeUndefined();
  });
});
