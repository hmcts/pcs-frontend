import config from 'config';

import { HTTPError } from '../../../main/HttpError';

import { http } from '@modules/http';
import { CaseState, CcdCase, CitizenGenAppRequest, GenAppType } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';

jest.mock('config');
jest.mock('@modules/http');

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
        `${mockUrl}/cases/${caseId}/event-triggers/respondPossessionClaim?ignore-warning=false`,
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

    it('should throw HTTPError on case not found', async () => {
      const caseId = '1234567890123456';

      mockGet.mockRejectedValue({
        response: { status: 404, data: { message: 'Not found' } },
        message: 'Case not found',
      });

      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow('Case not found');
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
    it('calls submitEvent with correct args', async () => {
      mockGet.mockResolvedValue({ data: { token: 'event-token' } });
      mockPost.mockResolvedValue({ data: { id: '999', data: { applicantForename: 'bar' } } });

      const result = await ccdCaseService.createCase(accessToken, { applicantForename: 'bar' });

      expect(result).toEqual({ id: '999', data: { applicantForename: 'bar' } });
    });
  });

  describe('updateCase', () => {
    it('throws HTTPError if case id is missing', async () => {
      await expect(ccdCaseService.updateDraftRespondToClaim(accessToken, '', { data: {} })).rejects.toThrow(HTTPError);

      await expect(ccdCaseService.updateDraftRespondToClaim(accessToken, '', { data: {} })).rejects.toThrow(
        'Cannot UPDATE draft, Case Id not specified'
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

  describe('submitGeneralApplication', () => {
    it('throws HTTPError if case id is missing', async () => {
      await expect(ccdCaseService.submitGeneralApplication(accessToken, { id: '', data: {} })).rejects.toThrow(
        HTTPError
      );
      await expect(ccdCaseService.submitGeneralApplication(accessToken, { id: '', data: {} })).rejects.toThrow(
        'Cannot submit general application, case ID not specified'
      );
    });

    it('submits via a CCD event', async () => {
      const caseId = '1234';
      const citizenGenAppRequest: CitizenGenAppRequest = { applicationType: GenAppType.ADJOURN };
      const ccdData: CcdCase = { id: caseId, data: { citizenGenAppRequest } };
      const eventToken = 'event token here';

      mockGet.mockResolvedValue({
        data: {
          token: eventToken,
        },
      });

      mockPost.mockResolvedValue({
        data: {},
      });

      await ccdCaseService.submitGeneralApplication(accessToken, ccdData);

      expect(mockGet).toHaveBeenCalledWith(
        `${mockUrl}/cases/${caseId}/event-triggers/citizenCreateGenApp`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );

      expect(mockPost).toHaveBeenCalledWith(
        `${mockUrl}/cases/${caseId}/events`,
        {
          data: {
            citizenGenAppRequest,
          },
          event: {
            id: 'citizenCreateGenApp',
            summary: 'Citizen citizenCreateGenApp summary',
            description: 'Citizen citizenCreateGenApp description',
          },
          event_token: eventToken,
          ignore_warning: false,
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
    });
  });

  describe('getExistingCaseData', () => {
    it('throws if case data errors', async () => {
      mockGet.mockRejectedValue({ response: { status: 400 } });
      await expect(ccdCaseService.getExistingCaseData(accessToken, '')).rejects.toThrow(HTTPError);
    });
  });

  describe('getDashboardView', () => {
    const caseId = '1234567890123456';

    it('GETs dashboardView event trigger and returns transformed dashboard data', async () => {
      mockGet.mockResolvedValue({
        data: {
          case_details: {
            case_data: {
              dashboardData: {
                notifications: [
                  {
                    id: 'n1',
                    value: {
                      templateId: 'Defendant.CaseIssued',
                      templateValues: [{ id: 'k1', value: { key: 'foo', value: 'bar' } }],
                    },
                  },
                ],
                taskGroups: [
                  {
                    id: 'g1',
                    value: {
                      groupId: 'CLAIM',
                      tasks: [
                        {
                          id: 't1',
                          value: { templateId: 'Defendant.ViewClaim', status: 'AVAILABLE' },
                        },
                      ],
                    },
                  },
                ],
                propertyAddress: {
                  AddressLine1: '1 Test Street',
                  PostTown: 'London',
                  PostCode: 'SW1A 1AA',
                },
              },
            },
          },
        },
      });

      const result = await ccdCaseService.getDashboardView(accessToken, caseId);

      expect(mockGet).toHaveBeenCalledWith(
        `${mockUrl}/cases/${caseId}/event-triggers/dashboardView?ignore-warning=false`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );

      expect(result).toEqual({
        notifications: [{ templateId: 'Defendant.CaseIssued', templateValues: { foo: 'bar' } }],
        taskGroups: [
          {
            groupId: 'CLAIM',
            tasks: [{ templateId: 'Defendant.ViewClaim', status: 'AVAILABLE' }],
          },
        ],
        propertyAddress: '1 Test Street, London, SW1A 1AA',
      });
    });

    it('returns empty notifications and task groups when dashboardData is absent', async () => {
      mockGet.mockResolvedValue({
        data: {
          case_details: {
            case_data: {},
          },
        },
      });

      const result = await ccdCaseService.getDashboardView(accessToken, caseId);

      expect(result).toEqual({
        notifications: [],
        taskGroups: [],
        propertyAddress: undefined,
      });
    });

    it('maps 404 from CCD to Case not found HTTPError', async () => {
      mockGet.mockRejectedValue({
        response: { status: 404, data: {} },
        message: 'Not found',
      });

      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow('Case not found');
    });

    it('maps 400 from CCD to Case not found HTTPError', async () => {
      mockGet.mockRejectedValue({
        response: { status: 400, data: {} },
        message: 'Bad request',
      });

      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow('Case not found');
    });

    it('maps other HTTP errors to CCD case service HTTPError', async () => {
      mockGet.mockRejectedValue({
        response: { status: 500, data: {} },
        message: 'Server error',
      });

      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow('CCD case service error');
    });
  });
});

describe('updateCase', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw HTTPError if case id is missing', async () => {
    await expect(ccdCaseService.updateDraftRespondToClaim(accessToken, '', { data: {} })).rejects.toThrow(HTTPError);
    await expect(ccdCaseService.updateDraftRespondToClaim(accessToken, '', { data: {} })).rejects.toThrow(
      'Cannot UPDATE draft, Case Id not specified'
    );
  });

  it('should call CCD validate endpoint and return merged data with caller-supplied id', async () => {
    const caseId = '1234567890123456';
    const mockData = { defendantName: 'John Doe' };

    mockPost.mockResolvedValue({
      data: { data: mockData, _links: { self: { href: 'self' } } },
    });

    const result = await ccdCaseService.updateDraftRespondToClaim(accessToken, caseId, mockData);

    expect(mockPost).toHaveBeenCalledWith(
      `${mockUrl}/case-types/PCS/validate?pageId=respondPossessionClaimrespondToPossessionDraftSavePage`,
      {
        event: {
          id: 'respondPossessionClaim',
          summary: 'Citizen respondPossessionClaim draft save summary',
          description: 'Citizen respondPossessionClaim draft save description',
        },
        case_reference: caseId,
        event_data: mockData,
        ignore_warning: false,
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${accessToken}`,
          experimental: true,
        }),
      })
    );

    expect(result).toEqual({ id: caseId, data: mockData });
  });

  it('should throw HTTPError when draft save fails with a generic error', async () => {
    const caseId = '1234567890123456';

    mockPost.mockRejectedValue({
      response: { status: 500 },
      message: 'Server exploded',
    });

    await expect(ccdCaseService.updateDraftRespondToClaim(accessToken, caseId, { foo: 'bar' })).rejects.toThrow(
      HTTPError
    );

    await expect(ccdCaseService.updateDraftRespondToClaim(accessToken, caseId, { foo: 'bar' })).rejects.toThrow(
      'CCD case service error'
    );
  });

  it('should surface CCD callback errors when the validate endpoint returns 422', async () => {
    const caseId = '1234567890123456';

    mockPost.mockRejectedValue({
      response: {
        status: 422,
        data: { callbackErrors: ['Invalid submission: immutable field nameKnown'] },
      },
      message: 'Unprocessable Entity',
    });

    await expect(ccdCaseService.updateDraftRespondToClaim(accessToken, caseId, { foo: 'bar' })).rejects.toThrow(
      'CCD callback rejected request: Invalid submission: immutable field nameKnown'
    );
  });
});
