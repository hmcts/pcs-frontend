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
    getCaseByIdForEvent: jest.fn(),
  },
}));

const mockGetCaseById = ccdCaseService.getCaseByIdForEvent as jest.Mock;
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
    mockGetCaseById.mockReset();
    mockLogger.warn.mockReset();
  });

  it('returns true when the START response flags showRelatedApplicationsPage as Yes', async () => {
    mockGetCaseById.mockResolvedValue({
      id: '1234567890123456',
      data: { showRelatedApplicationsPage: 'Yes' },
    });

    const result = await isViewAllApplicationsAvailable(buildRequest(), formData, currentStepData);

    expect(result).toBe(true);
    expect(mockGetCaseById).toHaveBeenCalledWith('access-token-1', '1234567890123456', 'uploadDocuments');
  });

  it('returns true regardless of casing on the Yes value', async () => {
    mockGetCaseById.mockResolvedValue({
      id: '1234567890123456',
      data: { showRelatedApplicationsPage: 'YES' },
    });

    const result = await isViewAllApplicationsAvailable(buildRequest(), formData, currentStepData);

    expect(result).toBe(true);
  });

  it('returns false when the START response flags showRelatedApplicationsPage as No', async () => {
    mockGetCaseById.mockResolvedValue({
      id: '1234567890123456',
      data: { showRelatedApplicationsPage: 'No' },
    });

    const result = await isViewAllApplicationsAvailable(buildRequest(), formData, currentStepData);

    expect(result).toBe(false);
  });

  it('returns false when showRelatedApplicationsPage is absent', async () => {
    mockGetCaseById.mockResolvedValue({ id: '1234567890123456', data: {} });

    const result = await isViewAllApplicationsAvailable(buildRequest(), formData, currentStepData);

    expect(result).toBe(false);
  });

  it('returns false and logs a warning when the START call throws', async () => {
    const error = new Error('boom');
    mockGetCaseById.mockRejectedValue(error);

    const result = await isViewAllApplicationsAvailable(buildRequest(), formData, currentStepData);

    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn.mock.calls[0][0]).toContain(
      'Failed to resolve uploadDocuments START for case 1234567890123456'
    );
  });

  it('returns false without calling CCD when accessToken is missing', async () => {
    const result = await isViewAllApplicationsAvailable(
      buildRequest({ accessToken: undefined }),
      formData,
      currentStepData
    );

    expect(result).toBe(false);
    expect(mockGetCaseById).not.toHaveBeenCalled();
  });

  it('returns false without calling CCD when caseReference is missing', async () => {
    const result = await isViewAllApplicationsAvailable(
      buildRequest({ caseReference: undefined }),
      formData,
      currentStepData
    );

    expect(result).toBe(false);
    expect(mockGetCaseById).not.toHaveBeenCalled();
  });
});
