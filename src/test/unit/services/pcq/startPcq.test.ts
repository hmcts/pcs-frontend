import axios from 'axios';
import config from 'config';
import { Request, Response } from 'express';
import { Session } from 'express-session';

import type { CcdCase } from '@services/ccdCase.interface';
import { CcdCaseModel } from '@services/ccdCaseData.model';
import { ccdCaseService } from '@services/ccdCaseService';
import * as createSecureTokenModule from '@services/pcq/createSecureToken';
import { startPcq } from '@services/pcq/startPcq';
import { isPcqEnabled } from '@utils/isPcqEnabled';

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
jest.mock('@utils/isPcqEnabled', () => ({
  isPcqEnabled: jest.fn(),
}));

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

    (isPcqEnabled as jest.Mock).mockResolvedValue(true);

    (config.get as jest.Mock).mockImplementation((key: string) => {
      const configMap: Record<string, unknown> = {
        'pcq.url': 'https://pcq.test',
        'pcq.path': '/service-endpoint',
        'pcq.serviceId': 'PCS',
        'pcq.actor': 'RESPONDENT',
        'pcq.healthTimeoutMs': 3000,
        'secrets.pcs.pcs-pcq-token-key': 'dummy-token-key',
      };
      return configMap[key];
    });

    (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'UP' } });

    (ccdCaseService.updateDraft as jest.Mock).mockResolvedValue({
      id: '123456789',
      data: { possessionClaimResponse: { defendantContactDetails: { party: { pcqId: 'mock-pcq-id' } } } },
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

    expect(axios.get).toHaveBeenCalledWith('https://pcq.test/health', { timeout: 3000 });
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

  it('asks PCQ for Welsh when the citizen is reading our pages in Welsh', async () => {
    (mockReq as Request & { language: string }).language = 'cy';

    const url = await startPcq(mockReq as Request);

    expect(url).toContain('language=cy');
    expect(createSecureTokenModule.createSecureToken).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'cy' }),
      'dummy-token-key'
    );
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

  it('reserves the PcqId against the defendant party before handing off', async () => {
    await startPcq(mockReq as Request);

    // On the party, not the slice root — that is what maps onto PartyEntity at final submission.
    const [, , , data] = (ccdCaseService.updateDraft as jest.Mock).mock.calls[0];
    expect(data.possessionClaimResponse.defendantContactDetails.party.pcqId).toEqual(expect.any(String));
  });

  it('re-sends the answers already given so the backend REPLACE cannot wipe them', async () => {
    mockRes.locals!.validatedCase = new CcdCaseModel({
      id: '123456789',
      data: {
        possessionClaimResponse: {
          defendantResponses: { freeLegalAdvice: 'YES' },
          defendantContactDetails: { party: { firstName: 'Ada' } },
        },
      },
    });

    await startPcq(mockReq as Request);

    // The draft-save fully replaces the defendant slice, so a pcqId-only post would drop the
    // citizen's existing answers.
    const [, , , data] = (ccdCaseService.updateDraft as jest.Mock).mock.calls[0];
    expect(data.possessionClaimResponse.defendantResponses.freeLegalAdvice).toBe('YES');
    expect(data.possessionClaimResponse.defendantContactDetails.party.firstName).toBe('Ada');
    expect(data.possessionClaimResponse.defendantContactDetails.party.pcqId).toEqual(expect.any(String));
  });

  it('returns null when the LaunchDarkly flag is off', async () => {
    (isPcqEnabled as jest.Mock).mockResolvedValue(false);

    expect(await startPcq(mockReq as Request)).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
    expect(ccdCaseService.updateDraft).not.toHaveBeenCalled();
  });

  it('returns null if the case or user session is missing', async () => {
    mockRes.locals!.validatedCase = undefined;

    expect(await startPcq(mockReq as Request)).toBeNull();
  });

  it('reserves no PcqId when the session cannot be saved', async () => {
    mockSave.mockImplementation(cb => cb(new Error('redis unavailable')));

    await expect(startPcq(mockReq as Request)).rejects.toThrow('redis unavailable');

    // An id committed to the draft but never handed to PCQ would make the guard skip PCQ on every
    // future visit — the citizen would silently never be asked again.
    expect(ccdCaseService.updateDraft).not.toHaveBeenCalled();
  });

  it('returns null when the PCQ health check times out', async () => {
    const timeout = Object.assign(new Error('timeout of 3000ms exceeded'), { code: 'ECONNABORTED' });
    (axios.get as jest.Mock).mockRejectedValue(timeout);

    // The citizen carries on to language-used rather than waiting on an unresponsive PCQ.
    expect(await startPcq(mockReq as Request)).toBeNull();
    expect(ccdCaseService.updateDraft).not.toHaveBeenCalled();
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

  it('returns null if the party already has a pcqId in the draft', async () => {
    mockRes.locals!.validatedCase = new CcdCaseModel({
      id: '123456789',
      data: {
        possessionClaimResponse: { defendantContactDetails: { party: { pcqId: 'existing-pcq-id' } } },
      },
    });

    expect(await startPcq(mockReq as Request)).toBeNull();
    expect(ccdCaseService.updateDraft).not.toHaveBeenCalled();
  });
});
