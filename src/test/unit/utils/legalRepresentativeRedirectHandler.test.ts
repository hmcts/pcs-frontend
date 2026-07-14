import config from 'config';
import type { Response } from 'express';

import { redirectToCaseManagement } from '@utils/legalRepresentativeRedirectHandler';

jest.mock('config');

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
