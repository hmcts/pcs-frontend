import axios from 'axios';
import config from 'config';
import { Request, Response } from 'express';
import { Session } from 'express-session';

import type { CcdCase } from '@services/ccdCase.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';
import { ccdCaseService } from '@services/ccdCaseService';
import * as createSecureTokenModule from '@services/pcq/createSecureToken';
import { startPcq } from '@services/pcq/startPcq';

interface CustomSession extends Session {
  user?: {
    sub: string;
    accessToken: string;
    idToken: string;
    refreshToken: string;
    email?: string;
  };
  ccdCase?: CcdCase;
}

jest.mock('axios');
jest.mock('config');
jest.mock('@modules/http', () => ({
  createHttp: () => ({
    get: jest.fn(),
    post: jest.fn(),
  }),
}));

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: {
    updateDraft: jest.fn(),
  },
}));
jest.mock('@services/pcq/createSecureToken');

describe('startPcq', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  const mockSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockRes = {
      locals: {
        validatedCase: new CcdCaseModel({
          id: '123456789',
          data: {},
        }),
      },
    };

    mockReq = {
      protocol: 'http',
      get: ((name: string) => (name === 'host' ? 'localhost:3000' : undefined)) as Request['get'],
      res: mockRes as Response,
      session: {
        save: mockSave,
        regenerate: jest.fn(),
        destroy: jest.fn(),
        reload: jest.fn(),
        touch: jest.fn(),
        cookie: {},
        id: 'mock-session-id',
        user: {
          sub: 'user-123',
          accessToken: 'test-token',
          idToken: 'dummy-id-token',
          refreshToken: 'dummy-refresh-token',
        },
      } as unknown as CustomSession,
    };

    mockSave.mockImplementation(cb => cb());

    (config.get as jest.Mock).mockImplementation((key: string) => {
      const configMap: Record<string, unknown> = {
        'pcq.enabled': true,
        'pcq.url': 'https://pcq.test',
        'pcq.path': '/service-endpoint',
        'pcq.serviceId': 'PCS',
        'pcq.actor': 'APPLICANT',
        'secrets.pcs.pcs-pcq-token-key': 'dummy-token-key',
      };
      return configMap[key];
    });

    (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'UP' } });

    (ccdCaseService.updateDraft as jest.Mock).mockResolvedValue({
      id: '123456789',
      data: { userPcqId: 'mock-pcq-id' },
    });

    (createSecureTokenModule.createSecureToken as jest.Mock).mockReturnValue({
      token: 'mock-token',
      authTag: 'mock-auth-tag',
      iv: 'mock-iv',
      salt: 'mock-salt',
    });
  });

  it('returns the PCQ URL when all conditions are met', async () => {
    const url = await startPcq(mockReq as Request);

    expect(axios.get).toHaveBeenCalledWith('https://pcq.test/health');
    expect(createSecureTokenModule.createSecureToken).toHaveBeenCalled();
    expect(ccdCaseService.updateDraft).toHaveBeenCalled();
    expect(url).toContain('https://pcq.test/service-endpoint?');
  });

  it('sends every field PCQ needs to take the secure verification path', async () => {
    const url = await startPcq(mockReq as Request);

    // PCQ only runs verifySecureToken when authTag, iv AND salt are all present — miss any one and
    // it silently drops to the legacy fixed-IV scheme, which cannot match our token.
    expect(url).toContain('token=mock-token');
    expect(url).toContain('authTag=mock-auth-tag');
    expect(url).toContain('iv=mock-iv');
    expect(url).toContain('salt=mock-salt');
  });

  it('returns the citizen to the case-scoped next step after PCQ', async () => {
    await startPcq(mockReq as Request);

    // Must carry the /case/<ref> prefix or PCQ returns the citizen to a 404, and nav=1 or the
    // access guard bounces the inbound redirect to a mid-section step.
    expect(createSecureTokenModule.createSecureToken).toHaveBeenCalledWith(
      expect.objectContaining({
        returnUrl: 'http://localhost:3000/case/123456789/respond-to-claim/language-used?nav=1',
      }),
      'dummy-token-key'
    );
  });

  it('encodes partyId exactly once in the redirect query', async () => {
    (mockReq.session as unknown as CustomSession).user!.email = 'user@email.com';

    const url = await startPcq(mockReq as Request);

    expect(url).toContain('partyId=user%40email.com');
    expect(url).not.toContain('%2540');

    // The token is computed over the raw value, so PCQ's decrypted params match what it decodes
    // off the query string.
    expect(createSecureTokenModule.createSecureToken).toHaveBeenCalledWith(
      expect.objectContaining({ partyId: 'user@email.com' }),
      'dummy-token-key'
    );
  });

  it('reserves the PcqId against the case before handing off', async () => {
    await startPcq(mockReq as Request);

    const [, , , data] = (ccdCaseService.updateDraft as jest.Mock).mock.calls[0];
    expect(data.userPcqId).toEqual(expect.any(String));
    expect(mockRes.locals?.validatedCase?.userPcqId).toBe('mock-pcq-id');
  });

  it('returns null if PCQ is not enabled', async () => {
    (config.get as jest.Mock).mockImplementation(key => (key === 'pcq.enabled' ? false : ''));

    expect(await startPcq(mockReq as Request)).toBeNull();
    expect(ccdCaseService.updateDraft).not.toHaveBeenCalled();
  });

  it('returns null if the case or user session is missing', async () => {
    mockRes.locals!.validatedCase = undefined;

    expect(await startPcq(mockReq as Request)).toBeNull();
  });

  it('returns null if the PCQ health check fails', async () => {
    (axios.get as jest.Mock).mockRejectedValue(new Error('Service down'));

    expect(await startPcq(mockReq as Request)).toBeNull();
    expect(ccdCaseService.updateDraft).not.toHaveBeenCalled();
  });

  it('returns null if the CCD update fails', async () => {
    (ccdCaseService.updateDraft as jest.Mock).mockRejectedValue(new Error('CCD error'));

    expect(await startPcq(mockReq as Request)).toBeNull();
  });

  it('returns null if the party already has a userPcqId', async () => {
    mockRes.locals!.validatedCase = new CcdCaseModel({
      id: '123456789',
      data: {
        userPcqId: 'existing-pcq-id',
      },
    });

    expect(await startPcq(mockReq as Request)).toBeNull();
    expect(ccdCaseService.updateDraft).not.toHaveBeenCalled();
  });
});
