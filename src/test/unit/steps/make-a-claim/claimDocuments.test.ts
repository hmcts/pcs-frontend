import type { Request } from 'express';

import { ccdCaseService } from '../../../../main/services/ccdCaseService';
import { claimDocumentStorage } from '../../../../main/steps/make-a-claim/claimDocuments';

jest.mock('../../../../main/services/ccdCaseService', () => ({
  ccdCaseService: { updateDraft: jest.fn(), getCaseByIdForEvent: jest.fn() },
}));
jest.mock('../../../../main/steps/utils/userRole', () => ({ getUserToken: () => 'token' }));

const service = ccdCaseService as jest.Mocked<typeof ccdCaseService>;
const CASE = '1777027600017761';
const DOCUMENT = { document_url: 'http://dm/1', document_filename: 'notice.pdf', document_binary_url: 'http://dm/1/b' };

const storage = claimDocumentStorage(
  'upload-notice',
  claim => claim.notice?.noticeDocuments,
  (claim, documents) => {
    claim.notice = { ...claim.notice, noticeDocuments: documents };
  }
);

const request = { params: { caseReference: CASE } } as unknown as Request;

describe('claimDocumentStorage', () => {
  beforeEach(() => {
    service.updateDraft.mockResolvedValue({ id: CASE, data: {} });
    service.getCaseByIdForEvent.mockResolvedValue({
      id: CASE,
      data: {
        citizenPossessionClaim: {
          confirmedSections: ['claimant-cya', 'notice-cya'],
          notice: { noticeServed: 'YES', noticeAvailable: 'YES', noticeDocuments: [] },
        },
      },
    });
  });

  const savedClaim = () =>
    service.updateDraft.mock.lastCall?.[3].citizenPossessionClaim as { confirmedSections?: string[] } | undefined;

  it('withdraws the confirmation of the summary showing the documents when they change', async () => {
    await storage.save(request, [{ id: 'doc-1', value: { document: DOCUMENT } }]);
    expect(savedClaim()).toMatchObject({
      confirmedSections: ['claimant-cya'],
      notice: { noticeDocuments: [{ id: 'doc-1', value: DOCUMENT }] },
    });
  });

  it('keeps the confirmations when the documents are unchanged', async () => {
    await storage.save(request, []);
    expect(savedClaim()?.confirmedSections).toEqual(['claimant-cya', 'notice-cya']);
  });
});
