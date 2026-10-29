import type { Request } from 'express';

import {
  extractDocumentIdFromCollections,
  getNoticeDocumentInfo,
  getRentStatementDocumentInfo,
  getTenancyDocumentInfo,
  resolveStepDocumentId,
} from '../../../../../main/steps/respond-to-claim/utils/stepDocumentUtils';

import { ccdCaseService } from '@services/ccdCaseService';

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getCaseById: jest.fn(),
  },
}));

describe('stepDocumentUtils', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractDocumentIdFromCollections', () => {
    it('returns documentId when a valid document binaryUrl is found', () => {
      const caseData = {
        detailsTab_NoticeDetails: {
          noticeDocuments: [
            {
              id: 'doc-123',
              value: {
                document_filename: 'notice.pdf',
                document_binary_url: 'http://dm-store/documents/doc-123/binary',
              },
            },
          ],
        },
      };

      const result = extractDocumentIdFromCollections(caseData, [caseData.detailsTab_NoticeDetails.noticeDocuments]);
      expect(result).toEqual({ isDocumentUploaded: true, documentId: 'doc-123' });
    });

    it('returns isDocumentUploaded false when no valid downloadable document is found', () => {
      const caseData = {
        detailsTab_NoticeDetails: {
          noticeDocuments: [{ id: 'invalid-doc' }],
        },
      };

      const result = extractDocumentIdFromCollections(caseData, [caseData.detailsTab_NoticeDetails.noticeDocuments]);
      expect(result).toEqual({ isDocumentUploaded: false });
    });
  });

  describe('getNoticeDocumentInfo', () => {
    it('extracts notice document info from detailsTab_NoticeDetails', () => {
      const caseData = {
        detailsTab_NoticeDetails: {
          noticeDocuments: [
            {
              id: 'notice-abc-123',
              value: { document_binary_url: 'http://dm-store/documents/notice-abc-123/binary' },
            },
          ],
        },
      };

      const result = getNoticeDocumentInfo(caseData);
      expect(result).toEqual({ isDocumentUploaded: true, documentId: 'notice-abc-123' });
    });
  });

  describe('getTenancyDocumentInfo', () => {
    it('extracts tenancy document info from detailsTab_TenancyLicenceDetails', () => {
      const caseData = {
        detailsTab_TenancyLicenceDetails: {
          tenancyLicenceDocuments: [
            {
              id: 'tenancy-abc-123',
              value: { document_binary_url: 'http://dm-store/documents/tenancy-abc-123/binary' },
            },
          ],
        },
      };

      const result = getTenancyDocumentInfo(caseData);
      expect(result).toEqual({ isDocumentUploaded: true, documentId: 'tenancy-abc-123' });
    });
  });

  describe('getRentStatementDocumentInfo', () => {
    it('extracts rent statement document info from detailsTab_RentArrearsDetails', () => {
      const caseData = {
        detailsTab_RentArrearsDetails: {
          rentStatement: [
            {
              id: 'rent-abc-123',
              value: { document_binary_url: 'http://dm-store/documents/rent-abc-123/binary' },
            },
          ],
        },
      };

      const result = getRentStatementDocumentInfo(caseData);
      expect(result).toEqual({ isDocumentUploaded: true, documentId: 'rent-abc-123' });
    });
  });

  describe('resolveStepDocumentId', () => {
    it('returns documentId immediately if present in req.res.locals.validatedCase', async () => {
      const req = {
        res: {
          locals: {
            validatedCase: {
              data: {
                detailsTab_NoticeDetails: {
                  noticeDocuments: [
                    {
                      id: 'doc-local-123',
                      value: { document_binary_url: 'http://dm-store/documents/doc-local-123/binary' },
                    },
                  ],
                },
              },
            },
          },
        },
      } as unknown as Request;

      const docId = await resolveStepDocumentId(req, getNoticeDocumentInfo, 'testLogger');
      expect(docId).toBe('doc-local-123');
      expect(ccdCaseService.getCaseById).not.toHaveBeenCalled();
    });

    it('fetches full case from ccdCaseService if not present in req.res.locals.validatedCase', async () => {
      const req = {
        session: { user: { accessToken: 'token-123' } },
        params: { caseReference: '123456' },
        res: {
          locals: {
            validatedCase: { data: {} },
          },
        },
      } as unknown as Request;

      (ccdCaseService.getCaseById as jest.Mock).mockResolvedValue({
        data: {
          detailsTab_NoticeDetails: {
            noticeDocuments: [
              {
                id: 'doc-api-456',
                value: { document_binary_url: 'http://dm-store/documents/doc-api-456/binary' },
              },
            ],
          },
        },
      });

      const docId = await resolveStepDocumentId(req, getNoticeDocumentInfo, 'testLogger');
      expect(docId).toBe('doc-api-456');
      expect(ccdCaseService.getCaseById).toHaveBeenCalledWith('token-123', '123456');
    });

    it('returns empty string if document not found anywhere or on error', async () => {
      const req = {
        session: { user: { accessToken: 'token-123' } },
        params: { caseReference: '123456' },
        res: {
          locals: {
            validatedCase: { data: {} },
          },
        },
      } as unknown as Request;

      (ccdCaseService.getCaseById as jest.Mock).mockRejectedValue(new Error('CCD Error'));

      const docId = await resolveStepDocumentId(req, getNoticeDocumentInfo, 'testLogger');
      expect(docId).toBe('');
    });
  });
});
