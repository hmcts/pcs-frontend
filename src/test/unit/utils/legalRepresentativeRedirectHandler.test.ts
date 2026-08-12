import config from 'config';
import type { Request, Response } from 'express';

import { getCaseManagementUrl, redirectToCaseManagement } from '@utils/legalRepresentativeRedirectHandler';

jest.mock('config');

const MANAGE_CASE_BASE_URL = 'https://manage-case.platform.hmcts.net/cases/case-details/PCS/PCS';
const CASE_ID = '1771325608502536';
const LEGAL_REP_ROLE = 'caseworker-pcs-solicitor';

describe('redirectToCaseManagement', () => {
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockResponse = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  it('should redirect to the case management URL when config and caseId are present', () => {
    const mockBaseUrl = 'https://manage-case.platform.hmcts.net';
    const mockCaseId = '123456789';

    (config.has as jest.Mock).mockReturnValue(true);
    (config.get as jest.Mock).mockReturnValue(mockBaseUrl);

    redirectToCaseManagement(mockResponse as Response, mockCaseId);

    expect(config.has).toHaveBeenCalledWith('redirects.manageCaseReturnURL');
    expect(config.get).toHaveBeenCalledWith('redirects.manageCaseReturnURL');
    expect(mockResponse.redirect).toHaveBeenCalledWith(`${mockBaseUrl}/${mockCaseId}`);

    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.send).not.toHaveBeenCalled();
  });

  it('should return 404 if the redirect URL is missing from config', () => {
    (config.has as jest.Mock).mockReturnValue(false);

    redirectToCaseManagement(mockResponse as Response, '12345');

    expect(mockResponse.redirect).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.send).toHaveBeenCalledWith('Not Found');
  });

  it('should return 404 if caseId is undefined', () => {
    (config.has as jest.Mock).mockReturnValue(true);
    (config.get as jest.Mock).mockReturnValue('https://manage-case.net');

    redirectToCaseManagement(mockResponse as Response, undefined);

    expect(mockResponse.redirect).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.send).toHaveBeenCalledWith('Not Found');
  });
});

describe('getCaseManagementUrl', () => {
  type ReqOverrides = { roles?: unknown; caseId?: unknown; withRes?: boolean };

  const createReq = (overrides: ReqOverrides = {}): Request => {
    const roles = 'roles' in overrides ? overrides.roles : [LEGAL_REP_ROLE];
    return {
      session: { user: { roles } },
      res: { locals: { validatedCase: { id: CASE_ID } } }
    } as unknown as Request;
  };

  const configureBaseUrl = (baseUrl: string | null) => {
    (config.has as jest.Mock).mockReturnValue(true);
    (config.get as jest.Mock).mockReturnValue(baseUrl);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds the Manage Case case overview URL for a legal representative', () => {
    configureBaseUrl(MANAGE_CASE_BASE_URL);

    expect(getCaseManagementUrl(createReq())).toBe(`${MANAGE_CASE_BASE_URL}/${CASE_ID}`);
    expect(config.get).toHaveBeenCalledWith('redirects.manageCaseReturnURL');
  });

  it('does not read the redirect config for citizens', () => {
    configureBaseUrl(MANAGE_CASE_BASE_URL);

    getCaseManagementUrl(createReq({ roles: ['citizen'] }));

    expect(config.has).not.toHaveBeenCalled();
    expect(config.get).not.toHaveBeenCalled();
  });
});
