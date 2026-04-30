jest.mock('../../../../main/services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
    updateDraft: jest.fn(),
  },
}));

import type { Request } from 'express';

import { ccdDraftDocs, toDisplayDocuments } from '../../../../main/modules/documents/storage';

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
const PATH = ['possessionClaimResponse', 'defendantResponses', 'defendantDocuments'] as const;

describe('ccdDraftDocs', () => {
  const storage = ccdDraftDocs({ event: EVENT, path: PATH });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateDraft.mockResolvedValue({ id: 'case-123', data: {} });
  });

  describe('read', () => {
    it('returns docs from res.locals.validatedCase at the configured path', async () => {
      const req = makeReq({
        res: {
          locals: {
            validatedCase: {
              possessionClaimResponse: {
                defendantResponses: { defendantDocuments: [doc1] },
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
      const req = makeReq({ res: { locals: { validatedCase: {} } } });

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
    it('calls updateDraft with setAtPath-wrapped docs at configured path', async () => {
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
