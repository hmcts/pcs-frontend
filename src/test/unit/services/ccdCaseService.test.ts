import config from 'config';

import { HTTPError } from '../../../main/HttpError';

import { http } from '@modules/http';
import { CcdCase, CitizenGenAppRequest, GenAppState, GenAppType } from '@services/ccdCase.interface';
import { ccdCaseService } from '@services/ccdCaseService';

jest.mock('config');
jest.mock('@modules/http');

const mockPost = http.post as jest.Mock;
const mockGet = http.get as jest.Mock;

const accessToken = 'token';
const mockUrl = 'http://ccd.example.com';
const caseId = '1234567890123456';
const eventId = 'respondPossessionClaim';

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

  describe('getCaseByIdForEvent', () => {
    it('should retrieve case by ID for the given eventId', async () => {
      const mockCaseData = { applicantForename: 'John', applicantSurname: 'Doe' };

      mockGet.mockResolvedValue({
        data: {
          case_details: {
            case_data: mockCaseData,
          },
        },
      });

      const result = await ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId);

      expect(mockGet).toHaveBeenCalledWith(
        `${mockUrl}/cases/${caseId}/event-triggers/${eventId}?ignore-warning=false`,
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

    it('should retrieve case by ID with a custom eventId', async () => {
      const customEventId = 'customEvent';
      const mockCaseData = { applicantForename: 'Jane' };

      mockGet.mockResolvedValue({
        data: {
          case_details: {
            case_data: mockCaseData,
          },
        },
      });

      const result = await ccdCaseService.getCaseByIdForEvent(accessToken, caseId, customEventId);

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
      mockGet.mockResolvedValue({
        data: {},
      });

      const result = await ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId);

      expect(result).toEqual({
        id: caseId,
        data: {},
      });
    });

    it('should return empty data object when case_data is missing', async () => {
      mockGet.mockResolvedValue({
        data: {
          case_details: {},
        },
      });

      const result = await ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId);

      expect(result).toEqual({
        id: caseId,
        data: {},
      });
    });

    it('should throw HTTPError with 403 status on unauthorized access', async () => {
      mockGet.mockRejectedValue({
        response: { status: 403, data: { message: 'Forbidden' } },
        message: 'Request failed',
      });

      await expect(ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId)).rejects.toThrow('Not authorised');
    });

    it('should throw HTTPError with 403 status on case not found (404)', async () => {
      mockGet.mockRejectedValue({
        response: { status: 404, data: { message: 'Not found' } },
        message: 'Case not found',
      });

      await expect(ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId)).rejects.toThrow('Access denied');
      await expect(ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId)).rejects.toMatchObject({
        status: 403,
      });
    });

    it('should throw HTTPError with 403 status on invalid case (400)', async () => {
      mockGet.mockRejectedValue({
        response: { status: 400, data: { message: 'Case ID is not valid' } },
        message: 'Bad request',
      });

      await expect(ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId)).rejects.toThrow('Access denied');
      await expect(ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId)).rejects.toMatchObject({
        status: 403,
      });
    });

    it('should throw HTTPError on unexpected error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId)).rejects.toThrow(
        'CCD case service error'
      );
    });
  });

  describe('getCaseById read', () => {
    it('should retrieve read case data from data', async () => {
      const mockCaseData = { statementOfCase: ['document'] };

      mockGet.mockResolvedValue({
        data: {
          id: caseId,
          data: mockCaseData,
        },
      });

      const result = await ccdCaseService.getCaseById(accessToken, caseId);

      expect(mockGet).toHaveBeenCalledWith(
        `${mockUrl}/cases/${caseId}`,
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

    it('should return empty data object when data is missing', async () => {
      mockGet.mockResolvedValue({
        data: {
          id: caseId,
        },
      });

      const result = await ccdCaseService.getCaseById(accessToken, caseId);

      expect(result).toEqual({
        id: caseId,
        data: {},
      });
    });

    it('should throw HTTPError with 403 status on case not found (404)', async () => {
      mockGet.mockRejectedValue({
        response: { status: 404, data: { message: 'Not found' } },
        message: 'Case not found',
      });

      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow('Access denied');
      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toMatchObject({ status: 403 });
    });

    it('should throw HTTPError with 403 status on invalid case (400)', async () => {
      mockGet.mockRejectedValue({
        response: { status: 400, data: { message: 'Case ID is not valid' } },
        message: 'Bad request',
      });

      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toThrow('Access denied');
      await expect(ccdCaseService.getCaseById(accessToken, caseId)).rejects.toMatchObject({ status: 403 });
    });

    it('maps 502 CallbackException from about-to-start callback to Access denied HTTPError', async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 502,
          data: {
            exception: 'uk.gov.hmcts.ccd.endpoint.exceptions.CallbackException',
            status: 502,
            message:
              'Callback to service has been unsuccessful for event Dashboard view url https://pcs-api.example.com/callbacks/about-to-start?eventId=respondPossessionClaim caseTypeId PCS caseEvent Id respondPossessionClaim callbackType AboutToStart',
          },
        },
        message: 'Bad Gateway',
      });

      await expect(ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getCaseByIdForEvent(accessToken, caseId, eventId)).rejects.toThrow('Access denied');
    });
  });

  describe('getExistingCaseData', () => {
    it('should retrieve existing case data from respondPossessionClaim event trigger', async () => {
      const mockCaseData = { defendantName: 'Jane Doe' };

      mockGet.mockResolvedValue({
        data: {
          case_details: {
            case_data: mockCaseData,
          },
        },
      });

      const result = await ccdCaseService.getExistingCaseData(accessToken, caseId);

      expect(mockGet).toHaveBeenCalledWith(
        `${mockUrl}/cases/${caseId}/event-triggers/respondPossessionClaim?ignore-warning=false`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
      expect(result).toEqual({
        case_details: {
          case_data: mockCaseData,
        },
      });
    });

    it('should throw HTTPError with 403 status on case not found (404)', async () => {
      mockGet.mockRejectedValue({
        response: { status: 404, data: { message: 'Not found' } },
        message: 'Case not found',
      });

      await expect(ccdCaseService.getExistingCaseData(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getExistingCaseData(accessToken, caseId)).rejects.toThrow('Access denied');
      await expect(ccdCaseService.getExistingCaseData(accessToken, caseId)).rejects.toMatchObject({ status: 403 });
    });

    it('should throw HTTPError with 403 status on invalid case (400)', async () => {
      mockGet.mockRejectedValue({
        response: { status: 400, data: { message: 'Case ID is not valid' } },
        message: 'Bad request',
      });

      await expect(ccdCaseService.getExistingCaseData(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getExistingCaseData(accessToken, caseId)).rejects.toThrow('Access denied');
      await expect(ccdCaseService.getExistingCaseData(accessToken, caseId)).rejects.toMatchObject({ status: 403 });
    });

    it('should preserve direct 403 from CCD', async () => {
      mockGet.mockRejectedValue({
        response: { status: 403, data: { message: 'Forbidden' } },
        message: 'Request failed',
      });

      await expect(ccdCaseService.getExistingCaseData(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getExistingCaseData(accessToken, caseId)).rejects.toThrow('Not authorised');
    });

    it('maps 502 CallbackException from about-to-start callback to Access denied HTTPError', async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 502,
          data: {
            exception: 'uk.gov.hmcts.ccd.endpoint.exceptions.CallbackException',
            status: 502,
            message:
              'Callback to service has been unsuccessful for event Respond to possession claim url https://pcs-api.example.com/callbacks/about-to-start?eventId=respondPossessionClaim caseTypeId PCS caseEvent Id respondPossessionClaim callbackType AboutToStart',
          },
        },
        message: 'Bad Gateway',
      });

      await expect(ccdCaseService.getExistingCaseData(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getExistingCaseData(accessToken, caseId)).rejects.toThrow('Access denied');
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
    const draftEvent = { id: 'respondPossessionClaim', pageId: 'respondToPossessionDraftSavePage' };

    it('throws HTTPError if case id is missing', async () => {
      await expect(ccdCaseService.updateDraft(draftEvent, accessToken, '', { data: {} })).rejects.toThrow(HTTPError);

      await expect(ccdCaseService.updateDraft(draftEvent, accessToken, '', { data: {} })).rejects.toThrow(
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
      const citizenGenAppRequest: CitizenGenAppRequest = { applicationType: GenAppType.ADJOURN };
      const ccdData: CcdCase = { id: caseId, data: { citizenGenAppRequest } };
      const eventToken = 'event token here';

      mockGet.mockResolvedValue({
        data: {
          token: eventToken,
        },
      });

      const expectedMakeAnApplicationResponse = {
        state: GenAppState.PENDING_GEN_APP_ISSUED,
        serviceRequestReference: 'SR-1234',
        feeAmount: 10.99,
      };

      mockPost.mockResolvedValue({
        data: {
          after_submit_callback_response: {
            confirmation_body: JSON.stringify(expectedMakeAnApplicationResponse),
          },
        },
      });

      const actualMakeAnApplicationResponse = await ccdCaseService.submitGeneralApplication(accessToken, ccdData);

      expect(mockGet).toHaveBeenCalledWith(
        `${mockUrl}/cases/${caseId}/event-triggers/makeAnApplication`,
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
            id: 'makeAnApplication',
            summary: 'Citizen makeAnApplication summary',
            description: 'Citizen makeAnApplication description',
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

      expect(actualMakeAnApplicationResponse).toEqual(expectedMakeAnApplicationResponse);
    });

    it('throws HTTPError if confirmation body is missing from response', async () => {
      const citizenGenAppRequest: CitizenGenAppRequest = { applicationType: GenAppType.ADJOURN };
      const ccdData: CcdCase = { id: caseId, data: { citizenGenAppRequest } };
      const eventToken = 'event token here';

      mockGet.mockResolvedValue({
        data: {
          token: eventToken,
        },
      });

      mockPost.mockResolvedValue({
        data: {
          after_submit_callback_response: {
            confirmation_body: undefined,
          },
        },
      });

      await expect(ccdCaseService.submitGeneralApplication(accessToken, ccdData)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.submitGeneralApplication(accessToken, ccdData)).rejects.toThrow(
        'No confirmation body found in response data'
      );
    });
  });

  describe('getDashboardView', () => {
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
                          value: { templateId: 'ViewClaim', status: 'AVAILABLE' },
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
            tasks: [{ templateId: 'ViewClaim', status: 'AVAILABLE' }],
          },
        ],
        propertyAddress: '1 Test Street, London, SW1A 1AA',
        relatedApplications: [],
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
        relatedApplications: [],
      });
    });

    it('maps 404 from CCD to Access denied HTTPError', async () => {
      mockGet.mockRejectedValue({
        response: { status: 404, data: {} },
        message: 'Not found',
      });

      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow('Access denied');
      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toMatchObject({ status: 403 });
    });

    it('maps 400 from CCD to Access denied HTTPError', async () => {
      mockGet.mockRejectedValue({
        response: { status: 400, data: {} },
        message: 'Bad request',
      });

      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow('Access denied');
      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toMatchObject({ status: 403 });
    });

    it('maps 502 CallbackException from about-to-start callback to Access denied HTTPError', async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 502,
          data: {
            exception: 'uk.gov.hmcts.ccd.endpoint.exceptions.CallbackException',
            status: 502,
            message:
              'Callback to service has been unsuccessful for event Dashboard view url https://pcs-api.example.com/callbacks/about-to-start?eventId=dashboardView caseTypeId PCS caseEvent Id dashboardView callbackType AboutToStart',
          },
        },
        message: 'Bad Gateway',
      });

      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow('Access denied');
    });

    it('preserves 502 CallbackException without about-to-start as CCD case service error', async () => {
      mockGet.mockRejectedValue({
        response: {
          status: 502,
          data: {
            exception: 'uk.gov.hmcts.ccd.endpoint.exceptions.CallbackException',
            status: 502,
            message: 'Callback to service has been unsuccessful for event ... callbackType AboutToSubmit',
          },
        },
        message: 'Bad Gateway',
      });

      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow('CCD case service error');
      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toMatchObject({ status: 502 });
    });

    it('preserves generic 502 as CCD case service HTTPError', async () => {
      mockGet.mockRejectedValue({
        response: { status: 502, data: { message: 'Upstream unavailable' } },
        message: 'Bad Gateway',
      });

      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow('CCD case service error');
    });

    it('preserves 503 as CCD case service HTTPError', async () => {
      mockGet.mockRejectedValue({
        response: { status: 503, data: {} },
        message: 'Service unavailable',
      });

      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow(HTTPError);
      await expect(ccdCaseService.getDashboardView(accessToken, caseId)).rejects.toThrow('CCD case service error');
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
  const draftEvent = { id: 'respondPossessionClaim', pageId: 'respondToPossessionDraftSavePage' };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw HTTPError if case id is missing', async () => {
    await expect(ccdCaseService.updateDraft(draftEvent, accessToken, '', { data: {} })).rejects.toThrow(HTTPError);
    await expect(ccdCaseService.updateDraft(draftEvent, accessToken, '', { data: {} })).rejects.toThrow(
      'Cannot UPDATE draft, Case Id not specified'
    );
  });

  it('should call CCD validate endpoint and return merged data with caller-supplied id', async () => {
    const mockData = { defendantName: 'John Doe' };

    mockPost.mockResolvedValue({
      data: { data: mockData, _links: { self: { href: 'self' } } },
    });

    const result = await ccdCaseService.updateDraft(draftEvent, accessToken, caseId, mockData);

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
    mockPost.mockRejectedValue({
      response: { status: 500 },
      message: 'Server exploded',
    });

    await expect(ccdCaseService.updateDraft(draftEvent, accessToken, caseId, { foo: 'bar' })).rejects.toThrow(
      HTTPError
    );

    await expect(ccdCaseService.updateDraft(draftEvent, accessToken, caseId, { foo: 'bar' })).rejects.toThrow(
      'CCD case service error'
    );
  });

  it('should surface CCD callback errors when the validate endpoint returns 422', async () => {
    mockPost.mockRejectedValue({
      response: {
        status: 422,
        data: { callbackErrors: ['Invalid submission: immutable field nameKnown'] },
      },
      message: 'Unprocessable Entity',
    });

    await expect(ccdCaseService.updateDraft(draftEvent, accessToken, caseId, { foo: 'bar' })).rejects.toThrow(
      'CCD callback rejected request: Invalid submission: immutable field nameKnown'
    );
  });
});
