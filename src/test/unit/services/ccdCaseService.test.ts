import config from 'config';

import { CaseState } from '../../../main/interfaces/ccdCase.interface';
import { http } from '../../../main/modules/http';
import { ccdCaseService } from '../../../main/services/ccdCaseService';
import * as caseIdValidator from '../../../main/utils/caseIdValidator';

jest.mock('config');
jest.mock('../../../main/modules/http');
jest.mock('../../../main/utils/caseIdValidator');

const mockPost = http.post as jest.Mock;
const mockGet = http.get as jest.Mock;
const mockValidateCaseId = caseIdValidator.validateCaseId as jest.Mock;
const mockSanitizeCaseId = caseIdValidator.sanitizeCaseId as jest.Mock;

const accessToken = 'token';
const mockUrl = 'http://ccd.example.com';

(config.get as jest.Mock).mockImplementation(key => {
  if (key === 'ccd.url') {
    return mockUrl;
  }
  if (key === 'ccd.caseTypeId') {
    return 'PCS';
  }
});

describe('ccdCaseService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCase', () => {
    it('returns latest draft case if found', async () => {
      mockPost.mockResolvedValue({
        data: {
          cases: [
            { id: '123', state: CaseState.DRAFT, case_data: { applicantForename: 'value' } },
            { id: '456', state: 'SUBMITTED', case_data: {} },
          ],
        },
      });

      const result = await ccdCaseService.getCase(accessToken);

      expect(result).toEqual({ id: '123', data: { applicantForename: 'value' } });
    });

    it('returns null if no draft case found', async () => {
      mockPost.mockResolvedValue({
        data: { cases: [{ id: '456', state: 'SUBMITTED', case_data: {} }] },
      });

      const result = await ccdCaseService.getCase(accessToken);

      expect(result).toBeNull();
    });

    it('returns null on 404 error', async () => {
      mockPost.mockRejectedValue({ response: { status: 404 } });

      const result = await ccdCaseService.getCase(accessToken);
      expect(result).toBeNull();
    });

    it('throws on unexpected error', async () => {
      mockPost.mockRejectedValue(new Error('Unexpected'));

      await expect(ccdCaseService.getCase(accessToken)).rejects.toThrow('Unexpected');
    });
  });

  describe('createCase', () => {
    it('calls submitEvent with correct args', async () => {
      mockGet.mockResolvedValue({ data: { token: 'event-token' } });
      mockPost.mockResolvedValue({ data: { id: '999', data: { applicantForename: 'bar' } } });

      const result = await ccdCaseService.createCase(accessToken, { applicantForename: 'bar' });

      expect(result).toEqual({ id: '999', data: { applicantForename: 'bar' } });
    });
  });

  describe('updateCase', () => {
    it('throws if case id is missing', async () => {
      await expect(ccdCaseService.updateCase(accessToken, { id: '', data: {} })).rejects.toEqual(
        'Cannot UPDATE Case, CCD Case Not found'
      );
    });
  });

  describe('submitCase', () => {
    it('throws if case id is missing', async () => {
      await expect(ccdCaseService.submitCase(accessToken, { id: '', data: {} })).rejects.toEqual(
        'Cannot SUBMIT Case, CCD Case Not found'
      );
    });
  });

  describe('updateCaseDocuments', () => {
    const caseId = '1234567890123456';
    const mockDocuments = [
      {
        id: 'doc1',
        value: {
          documentType: 'LETTER_FROM_CLAIMANT',
          document: {
            document_url: 'http://example.com/doc1',
            document_filename: 'test.pdf',
            document_binary_url: 'http://example.com/doc1/binary',
          },
          description: 'Test document',
        },
      },
      {
        id: 'doc2',
        value: {
          documentType: 'LETTER_FROM_CLAIMANT',
          document: {
            document_url: 'http://example.com/doc2',
            document_filename: 'test2.pdf',
            document_binary_url: 'http://example.com/doc2/binary',
          },
          description: null,
        },
      },
    ];

    beforeEach(() => {
      mockValidateCaseId.mockReturnValue(true);
      mockSanitizeCaseId.mockImplementation((id: string) => id);
    });

    it('should successfully update documents with valid case ID', async () => {
      const eventToken = 'test-event-token';
      const mockResponse = {
        id: caseId,
        data: {
          citizenDocuments: mockDocuments,
        },
      };

      mockGet.mockResolvedValue({ data: { token: eventToken } });
      mockPost.mockResolvedValue({ data: mockResponse });

      const result = await ccdCaseService.updateCaseDocuments(accessToken, caseId, mockDocuments);

      expect(mockValidateCaseId).toHaveBeenCalledWith(caseId);
      expect(mockSanitizeCaseId).toHaveBeenCalledWith(caseId);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for invalid case ID format', async () => {
      mockValidateCaseId.mockReturnValue(false);

      await expect(ccdCaseService.updateCaseDocuments(accessToken, 'invalid-id', mockDocuments)).rejects.toThrow(
        'Invalid case ID format'
      );

      expect(mockValidateCaseId).toHaveBeenCalledWith('invalid-id');
      expect(mockGet).not.toHaveBeenCalled();
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('should sanitize case ID before making requests', async () => {
      const unsanitizedCaseId = '1234-5678-9012-3456';
      const sanitizedCaseId = '1234567890123456';
      mockSanitizeCaseId.mockReturnValue(sanitizedCaseId);

      mockGet.mockResolvedValue({ data: { token: 'test-token' } });
      mockPost.mockResolvedValue({ data: { id: sanitizedCaseId, data: {} } });

      await ccdCaseService.updateCaseDocuments(accessToken, unsanitizedCaseId, mockDocuments);

      expect(mockSanitizeCaseId).toHaveBeenCalledWith(unsanitizedCaseId);
      expect(mockGet).toHaveBeenCalledWith(
        `${mockUrl}/cases/${sanitizedCaseId}/event-triggers/citizenUpdateApplication`,
        expect.any(Object)
      );
      expect(mockPost).toHaveBeenCalledWith(
        `${mockUrl}/cases/${sanitizedCaseId}/events`,
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should get event token with correct URL and headers', async () => {
      const eventToken = 'test-event-token';
      mockGet.mockResolvedValue({ data: { token: eventToken } });
      mockPost.mockResolvedValue({ data: { id: caseId, data: {} } });

      await ccdCaseService.updateCaseDocuments(accessToken, caseId, mockDocuments);

      expect(mockGet).toHaveBeenCalledWith(`${mockUrl}/cases/${caseId}/event-triggers/citizenUpdateApplication`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          experimental: true,
          Accept: '*/*',
          'Content-Type': 'application/json',
        },
      });
    });

    it('should format documents correctly in payload', async () => {
      const eventToken = 'test-event-token';
      mockGet.mockResolvedValue({ data: { token: eventToken } });
      mockPost.mockResolvedValue({ data: { id: caseId, data: {} } });

      await ccdCaseService.updateCaseDocuments(accessToken, caseId, mockDocuments);

      expect(mockPost).toHaveBeenCalledWith(
        `${mockUrl}/cases/${caseId}/events`,
        {
          event: {
            id: 'citizenUpdateApplication',
          },
          data: {
            citizenDocuments: mockDocuments,
          },
          event_token: eventToken,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            experimental: true,
            Accept: '*/*',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle empty documents array', async () => {
      const eventToken = 'test-event-token';
      const emptyDocuments: typeof mockDocuments = [];

      mockGet.mockResolvedValue({ data: { token: eventToken } });
      mockPost.mockResolvedValue({ data: { id: caseId, data: { citizenDocuments: [] } } });

      const result = await ccdCaseService.updateCaseDocuments(accessToken, caseId, emptyDocuments);

      expect(mockPost).toHaveBeenCalledWith(
        `${mockUrl}/cases/${caseId}/events`,
        expect.objectContaining({
          data: {
            citizenDocuments: [],
          },
        }),
        expect.any(Object)
      );
      expect(result).toEqual({ id: caseId, data: { citizenDocuments: [] } });
    });

    it('should handle event token retrieval errors', async () => {
      const tokenError = new Error('Failed to get event token');
      mockGet.mockRejectedValue(tokenError);

      await expect(ccdCaseService.updateCaseDocuments(accessToken, caseId, mockDocuments)).rejects.toThrow(
        'Failed to get event token'
      );

      expect(mockGet).toHaveBeenCalled();
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('should handle CCD submission errors', async () => {
      const eventToken = 'test-event-token';
      const submissionError = new Error('CCD submission failed');

      mockGet.mockResolvedValue({ data: { token: eventToken } });
      mockPost.mockRejectedValue(submissionError);

      await expect(ccdCaseService.updateCaseDocuments(accessToken, caseId, mockDocuments)).rejects.toThrow(
        'CCD submission failed'
      );

      expect(mockGet).toHaveBeenCalled();
      expect(mockPost).toHaveBeenCalled();
    });

    it('should use correct event ID for citizenUpdateApplication', async () => {
      const eventToken = 'test-event-token';
      mockGet.mockResolvedValue({ data: { token: eventToken } });
      mockPost.mockResolvedValue({ data: { id: caseId, data: {} } });

      await ccdCaseService.updateCaseDocuments(accessToken, caseId, mockDocuments);

      const postCallArgs = mockPost.mock.calls[0];
      expect(postCallArgs[1]).toEqual(
        expect.objectContaining({
          event: {
            id: 'citizenUpdateApplication',
          },
        })
      );
    });
  });
});
