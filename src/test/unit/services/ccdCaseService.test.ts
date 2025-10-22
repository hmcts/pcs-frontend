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

    it('throws if case id has invalid format', async () => {
      await expect(ccdCaseService.updateCase(accessToken, { id: 'invalid-id', data: {} })).rejects.toThrow(
        'Invalid case reference format. Must be a 16-digit numeric string.'
      );
    });

    it('throws if case id contains path traversal attempt', async () => {
      await expect(ccdCaseService.updateCase(accessToken, { id: '../admin/delete', data: {} })).rejects.toThrow(
        'Invalid case reference format. Must be a 16-digit numeric string.'
      );
    });

    it('successfully updates case with valid 16-digit case id', async () => {
      mockGet.mockResolvedValue({ data: { token: 'event-token' } });
      mockPost.mockResolvedValue({ data: { id: '1761061165632943', data: { applicantForename: 'John' } } });

      const result = await ccdCaseService.updateCase(accessToken, {
        id: '1761061165632943',
        data: { applicantForename: 'John' },
      });

      expect(result).toEqual({ id: '1761061165632943', data: { applicantForename: 'John' } });
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/cases/1761061165632943/event-triggers/citizenUpdateApplication'),
        expect.any(Object)
      );
    });
  });

  describe('submitCase', () => {
    it('throws if case id is missing', async () => {
      await expect(ccdCaseService.submitCase(accessToken, { id: '', data: {} })).rejects.toEqual(
        'Cannot SUBMIT Case, CCD Case Not found'
      );
    });

    it('throws if case id has invalid format', async () => {
      await expect(ccdCaseService.submitCase(accessToken, { id: 'malicious@evil.com', data: {} })).rejects.toThrow(
        'Invalid case reference format. Must be a 16-digit numeric string.'
      );
    });

    it('successfully submits case with valid 16-digit case id', async () => {
      mockGet.mockResolvedValue({ data: { token: 'event-token' } });
      mockPost.mockResolvedValue({ data: { id: '1761061165632943', data: { applicantForename: 'John' } } });

      const result = await ccdCaseService.submitCase(accessToken, {
        id: '1761061165632943',
        data: { applicantForename: 'John' },
      });

      expect(result).toEqual({ id: '1761061165632943', data: { applicantForename: 'John' } });
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/cases/1761061165632943/event-triggers/citizenSubmitApplication'),
        expect.any(Object)
      );
    });
  });
});
