import type { Request } from 'express';

import { Logger } from '../../../../../main/modules/logger';
import { isViewAllApplicationsAvailable } from '../../../../../main/steps/case-tasks/upload-additional-documents/flowConditions';

import { ccdCaseService } from '@services/ccdCaseService';

jest.mock('../../../../../main/modules/logger', () => {
  const loggerInstance = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return {
    Logger: {
      getLogger: jest.fn(() => loggerInstance),
    },
  };
});

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    getDashboardView: jest.fn(),
  },
}));

const mockGetDashboardView = ccdCaseService.getDashboardView as jest.Mock;
const mockLogger = (Logger.getLogger as jest.Mock)() as { warn: jest.Mock };

const formData = {} as Record<string, unknown>;
const currentStepData = {} as Record<string, unknown>;

const buildRequest = (
  overrides: {
    accessToken?: string;
    caseReference?: string;
  } = {}
): Request => {
  const accessToken = 'accessToken' in overrides ? overrides.accessToken : 'access-token-1';
  const caseReference = 'caseReference' in overrides ? overrides.caseReference : '1234567890123456';
  return {
    session: {
      user: accessToken === undefined ? undefined : { accessToken },
    },
    res: {
      locals: {
        validatedCase: caseReference === undefined ? undefined : { id: caseReference },
      },
    },
  } as unknown as Request;
};

describe('isViewAllApplicationsAvailable', () => {
  beforeEach(() => {
    mockGetDashboardView.mockReset();
    mockLogger.warn.mockReset();
  });

  it('returns true when ViewAllApplications is AVAILABLE in the APPLICATIONS group', async () => {
    mockGetDashboardView.mockResolvedValue({
      notifications: [],
      taskGroups: [
        {
          groupId: 'APPLICATIONS',
          tasks: [{ templateId: 'ViewAllApplications', status: 'AVAILABLE' }],
        },
      ],
      propertyAddress: undefined,
    });

    const result = await isViewAllApplicationsAvailable(buildRequest(), formData, currentStepData);

    expect(result).toBe(true);
    expect(mockGetDashboardView).toHaveBeenCalledWith('access-token-1', '1234567890123456');
  });

  it('returns true when ViewAllApplications is AVAILABLE in any group', async () => {
    mockGetDashboardView.mockResolvedValue({
      notifications: [],
      taskGroups: [
        {
          groupId: 'CLAIM',
          tasks: [{ templateId: 'ViewClaim', status: 'AVAILABLE' }],
        },
        {
          groupId: 'DOCUMENTS',
          tasks: [
            { templateId: 'UploadDocuments', status: 'AVAILABLE' },
            { templateId: 'ViewAllApplications', status: 'AVAILABLE' },
          ],
        },
      ],
      propertyAddress: undefined,
    });

    const result = await isViewAllApplicationsAvailable(buildRequest(), formData, currentStepData);

    expect(result).toBe(true);
  });

  it('returns false when ViewAllApplications is NOT_AVAILABLE', async () => {
    mockGetDashboardView.mockResolvedValue({
      notifications: [],
      taskGroups: [
        {
          groupId: 'APPLICATIONS',
          tasks: [{ templateId: 'ViewAllApplications', status: 'NOT_AVAILABLE' }],
        },
      ],
      propertyAddress: undefined,
    });

    const result = await isViewAllApplicationsAvailable(buildRequest(), formData, currentStepData);

    expect(result).toBe(false);
  });

  it('returns false when ViewAllApplications task is missing', async () => {
    mockGetDashboardView.mockResolvedValue({
      notifications: [],
      taskGroups: [
        {
          groupId: 'CLAIM',
          tasks: [{ templateId: 'ViewClaim', status: 'AVAILABLE' }],
        },
      ],
      propertyAddress: undefined,
    });

    const result = await isViewAllApplicationsAvailable(buildRequest(), formData, currentStepData);

    expect(result).toBe(false);
  });

  it('returns false when taskGroups is empty', async () => {
    mockGetDashboardView.mockResolvedValue({
      notifications: [],
      taskGroups: [],
      propertyAddress: undefined,
    });

    const result = await isViewAllApplicationsAvailable(buildRequest(), formData, currentStepData);

    expect(result).toBe(false);
  });

  it('returns false and logs a warning when getDashboardView throws', async () => {
    const error = new Error('boom');
    mockGetDashboardView.mockRejectedValue(error);

    const result = await isViewAllApplicationsAvailable(buildRequest(), formData, currentStepData);

    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn.mock.calls[0][0]).toContain(
      'Failed to resolve VIEW_ALL_APPLICATIONS status for case 1234567890123456'
    );
  });

  it('returns false without calling CCD when accessToken is missing', async () => {
    const result = await isViewAllApplicationsAvailable(
      buildRequest({ accessToken: undefined }),
      formData,
      currentStepData
    );

    expect(result).toBe(false);
    expect(mockGetDashboardView).not.toHaveBeenCalled();
  });

  it('returns false without calling CCD when caseReference is missing', async () => {
    const result = await isViewAllApplicationsAvailable(
      buildRequest({ caseReference: undefined }),
      formData,
      currentStepData
    );

    expect(result).toBe(false);
    expect(mockGetDashboardView).not.toHaveBeenCalled();
  });
});
