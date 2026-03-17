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

  describe('getCaseById', () => {
    it('should retrieve case by ID with default eventId', async () => {
      const caseId = '1234567890123456';
      const mockCaseData = { applicantForename: 'John', applicantSurname: 'Doe' };

      mockGet.mockResolvedValue({
        data: {
          case_details: {
            case_data: mockCaseData,
          },
        },
      });

      const result = await ccdCaseService.getCaseById(accessToken, caseId);

      expect(mockGet).toHaveBeenCalledWith(
        `${mockUrl}/cases/${caseId}/event-triggers/submitDefendantResponse?ignore-warning=false`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
      expect(result).toEqual({
        id: caseId,
        data: mockCaseData,
      });
    });

    it('should retrieve case by ID with custom eventId', async () => {
      const caseId = '1234567890123456';
      const customEventId = 'customEvent';
      const mockCaseData = { applicantForename: 'Jane' };

      mockGet.mockResolvedValue({
        data: {
          case_details: {
            case_data: mockCaseData,
          },
        },
      });

      const result = await ccdCaseService.getCaseById(accessToken, caseId, customEventId);

      expect(mockGet).toHaveBeenCalledWith(
        `${mockUrl}/cases/${caseId}/event-triggers/${customEventId}?ignore-warning=false`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
      expect(result).toEqual({
        id: caseId,
        data: mockCaseData,
      });
    });

    it('should return empty data object when case_details is missing', async () => {
      const caseId = '1234567890123456';

      mockGet.mockResolvedValue({
        data: {},
      });

      const result = await ccdCaseService.getCaseById(accessToken, caseId);

      expect(result).toEqual({
        id: caseId,
        data: {},
      });
    });

    it('should return empty data object when case_data is missing', async () => {
      const caseId = '1234567890123456';

      mockGet.mockResolvedValue({
        data: {
          case_details: {},
        },
      });

      const result = await ccdCaseService.getCaseById(accessToken, caseId);

      expect(result).toEqual({
        id: caseId,
        data: {},
      });
    });

    it('should throw HTTPError with 403 status on unauthorized access', async () => {
      const caseId = '1234567890123456';

      mockGet.mockRejectedValue({
        response: { status: 403, data: { message: 'Forbidden' } },
        message: 'Request failed',
      });

      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow('Not authorised');
    });

    it('should throw HTTPError with 403 status on unauthenticated request', async () => {
      const caseId = '1234567890123456';

      mockGet.mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } },
        message: 'Request failed',
      });

      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow('Not authorised');
    });

    it('should throw HTTPError on case not found', async () => {
      const caseId = '1234567890123456';

      mockGet.mockRejectedValue({
        response: { status: 404, data: { message: 'Not found' } },
        message: 'Case not found',
      });

      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow('CCD case service error');
    });

    it('should throw HTTPError on unexpected error', async () => {
      const caseId = '1234567890123456';

      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow('CCD case service error');
    });
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
    it('uses generated bindings to submit createPossessionClaim data', async () => {
      const propertyAddress = {
        AddressLine1: '123 Baker Street',
        AddressLine2: '',
        AddressLine3: '',
        PostTown: 'London',
        County: 'Greater London',
        PostCode: 'NW1 6XE',
        Country: 'United Kingdom',
      };

      mockGet.mockResolvedValue({
        data: {
          token: 'event-token',
          case_details: {
            case_data: {
              claimCreateFeeAmount: '£999999.99',
            },
          },
        },
      });
      mockPost.mockResolvedValue({ data: { id: '999' } });

      const result = await ccdCaseService.createCase(accessToken, {
        legislativeCountry: 'England',
        propertyAddress,
      });

      expect(mockGet).toHaveBeenCalledWith(
        `${mockUrl}/case-types/PCS/event-triggers/createPossessionClaim`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
      expect(mockPost).toHaveBeenCalledWith(
        `${mockUrl}/case-types/PCS/cases`,
        {
          data: {
            claimCreateFeeAmount: '£999999.99',
            claimCreateLegislativeCountry: 'England',
            claimCreatePropertyAddress: propertyAddress,
          },
          event: { id: 'createPossessionClaim' },
          event_token: 'event-token',
          ignore_warning: false,
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
      expect(result).toEqual({
        id: '999',
        data: {
          feeAmount: '£999999.99',
          legislativeCountry: 'England',
          propertyAddress,
        },
      });
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
      await expect(ccdCaseService.submitResponseToClaim(accessToken, '', {})).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.submitResponseToClaim(accessToken, '', {})).rejects.toThrow(
        'Cannot Submit Response to Case, CCD Case Not found'
      );
    });

    it('uses generated bindings to submit response-to-claim data', async () => {
      const correspondenceAddress = {
        AddressLine1: '10 Example Street',
        AddressLine2: '',
        AddressLine3: '',
        PostTown: 'London',
        County: '',
        PostCode: 'SW1 1AA',
        Country: '',
      };

      mockGet.mockResolvedValue({
        data: {
          token: 'event-token',
          case_details: {
            case_data: {
              respDefSubmitDraftAnswers: 'Yes',
            },
          },
        },
      });
      mockPost.mockResolvedValue({ data: { id: '1234567890123456' } });

      const result = await ccdCaseService.submitResponseToClaim(accessToken, '1234567890123456', {
        correspondenceAddress,
        submitDraftAnswers: 'No',
      });

      expect(mockGet).toHaveBeenCalledWith(
        `${mockUrl}/cases/1234567890123456/event-triggers/submitDefendantResponse?ignore-warning=false`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
      expect(mockPost).toHaveBeenCalledWith(
        `${mockUrl}/cases/1234567890123456/events`,
        {
          data: {
            respDefCorrespondenceAddress: correspondenceAddress,
            respDefSubmitDraftAnswers: 'No',
          },
          event: { id: 'submitDefendantResponse' },
          event_token: 'event-token',
          ignore_warning: false,
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
      expect(result).toEqual({
        id: '1234567890123456',
        data: {
          correspondenceAddress,
          submitDraftAnswers: 'No',
        },
      });
    });
  });

  describe('getResponseToClaimData', () => {
    it('uses generated bindings to load submitDefendantResponse data', async () => {
      const correspondenceAddress = {
        AddressLine1: '10 Example Street',
        AddressLine2: '',
        AddressLine3: '',
        PostTown: 'London',
        County: '',
        PostCode: 'SW1 1AA',
        Country: '',
      };

      mockGet.mockResolvedValue({
        data: {
          token: 'event-token',
          case_details: {
            case_data: {
              respDefCorrespondenceAddress: correspondenceAddress,
              respDefSubmitDraftAnswers: 'No',
            },
          },
        },
      });

      const result = await ccdCaseService.getResponseToClaimData(accessToken, '1234567890123456');

      expect(mockGet).toHaveBeenCalledWith(
        `${mockUrl}/cases/1234567890123456/event-triggers/submitDefendantResponse?ignore-warning=false`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
      expect(result).toEqual({
        correspondenceAddress,
        submitDraftAnswers: 'No',
      });
    });

    it('throws if case data errors', async () => {
      mockGet.mockRejectedValue({ response: { status: 400 } });
      await expect(ccdCaseService.getResponseToClaimData(accessToken, '')).rejects.toThrow(HTTPError);
    });
  });
});
