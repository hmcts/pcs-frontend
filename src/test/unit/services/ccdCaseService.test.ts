import config from 'config';

import { HTTPError } from '../../../main/HttpError';
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

    it('throws HTTPError on unexpected error', async () => {
      mockPost.mockRejectedValue(new Error('Unexpected'));

      await expect(ccdCaseService.getCase(accessToken)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getCase(accessToken)).rejects.toThrow('CCD case service error');
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
    it('throws HTTPError if case id is missing', async () => {
      await expect(ccdCaseService.updateCase(accessToken, { id: '', data: {} })).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.updateCase(accessToken, { id: '', data: {} })).rejects.toThrow(
        'Cannot UPDATE Case, CCD Case Not found'
      );
    });
  });

  describe('submitCase', () => {
    it('throws HTTPError if case id is missing', async () => {
      await expect(ccdCaseService.submitCase(accessToken, { id: '', data: {} })).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.submitCase(accessToken, { id: '', data: {} })).rejects.toThrow(
        'Cannot SUBMIT Case, CCD Case Not found'
      );
    });
  });

  describe('submitResponseToClaim', () => {
    it('throws HTTPError if case id is missing', async () => {
      await expect(ccdCaseService.submitResponseToClaim(accessToken, { id: '', data: {} })).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.submitResponseToClaim(accessToken, { id: '', data: {} })).rejects.toThrow(
        'Cannot Submit Response to Case, CCD Case Not found'
      );
    });
  });

  describe('getExistingCaseData', () => {
    it('throws if case data errors', async () => {
      mockGet.mockRejectedValue({ response: { status: 400 } });
      await expect(ccdCaseService.getExistingCaseData(accessToken, '')).rejects.toThrow(HTTPError);
    });
  });
});
