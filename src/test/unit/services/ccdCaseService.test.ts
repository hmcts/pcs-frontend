import config from 'config';

import { CaseState } from '../../../main/interfaces/ccdCase.interface';
import { http } from '../../../main/modules/http';
import { ccdCaseService } from '../../../main/services/ccdCaseService';

jest.mock('config');
jest.mock('../../../main/modules/http');

const mockPost = http.post as jest.Mock;
const mockGet = http.get as jest.Mock;

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

  describe('getCaseByReference', () => {
    it('returns case data when case is found', async () => {
      const mockCaseData = {
        id: '1234567890123456',
        data: { applicantForename: 'John', applicantSurname: 'Doe' },
      };
      mockGet.mockResolvedValue({ data: mockCaseData });

      const result = await ccdCaseService.getCaseByReference(accessToken, '1234567890123456');

      expect(mockGet).toHaveBeenCalledWith(`${mockUrl}/cases/1234567890123456`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          experimental: true,
          Accept: '*/*',
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockCaseData);
    });

    it('returns null when case is not found (404)', async () => {
      mockGet.mockRejectedValue({ response: { status: 404 } });

      const result = await ccdCaseService.getCaseByReference(accessToken, '9999999999999999');

      expect(result).toBeNull();
    });

    it('throws on unexpected error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(ccdCaseService.getCaseByReference(accessToken, '1234567890123456')).rejects.toThrow('Network error');
    });

    it('handles undefined access token', async () => {
      const mockCaseData = { id: '1234567890123456', data: { applicantForename: 'Jane' } };
      mockGet.mockResolvedValue({ data: mockCaseData });

      const result = await ccdCaseService.getCaseByReference(undefined, '1234567890123456');

      expect(mockGet).toHaveBeenCalledWith(`${mockUrl}/cases/1234567890123456`, {
        headers: {
          Authorization: 'Bearer ',
          experimental: true,
          Accept: '*/*',
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockCaseData);
    });
  });
});
