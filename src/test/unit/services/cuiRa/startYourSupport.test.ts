import config from 'config';
import type { Request } from 'express';

import { http } from '@modules/http';
import { ccdCaseService } from '@services/ccdCaseService';
import { cuiRaService } from '@services/cuiRa/cuiRaService';
import { startYourSupport } from '@services/cuiRa/startYourSupport';

jest.mock('config', () => ({
  get: jest.fn(),
}));

jest.mock('@services/ccdCaseService', () => ({
  ccdCaseService: { getDefendantSupport: jest.fn() },
}));

jest.mock('@services/cuiRa/cuiRaService', () => ({
  cuiRaService: { invokePayload: jest.fn() },
}));

jest.mock('@modules/steps', () => ({
  getValidatedLanguage: jest.fn(() => 'en'),
}));

jest.mock('@modules/logger', () => ({
  Logger: { getLogger: () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }) },
}));

jest.mock('@modules/http', () => ({
  http: { getValidS2SToken: jest.fn() },
}));

const mockGetValidS2SToken = http.getValidS2SToken as jest.Mock;

const configValues: Record<string, string> = {
  'cuiRa.hmctsServiceId': 'AAA3',
  'cuiRa.masterFlagCode': 'RA0001',
};

function buildReq(overrides: Record<string, unknown> = {}): { req: Request } {
  const req = {
    body: { reasonableAdjustmentsChoice: 'questions' },
    // callback/logout URLs are derived from the request host, so the req must expose protocol + host.
    protocol: 'https',
    get: (name: string) => (name.toLowerCase() === 'host' ? 'pcs.aat.platform.hmcts.net' : undefined),
    session: { user: { accessToken: 'idam-access-token' } },
    res: {
      locals: {
        validatedCase: {
          id: '1234123412341234',
          defendantContactDetailsPartyName: 'John Doe',
          claimantEnteredDefendantDetailsName: 'John Doe',
          defendantName: 'John Doe',
        },
      },
    },
    ...overrides,
  } as unknown as Request;
  return { req };
}

describe('startYourSupport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (config.get as jest.Mock).mockImplementation((key: string) => configValues[key]);
    (cuiRaService.invokePayload as jest.Mock).mockResolvedValue('https://cui-ra/microsite/xyz');
    mockGetValidS2SToken.mockResolvedValue('s2s-token-value');
  });

  it('builds the invocation payload from the case and returns the microsite url', async () => {
    const { req } = buildReq();

    const url = await startYourSupport(req);

    expect(url).toBe('https://cui-ra/microsite/xyz');
    expect(mockGetValidS2SToken).toHaveBeenCalled();
    expect(cuiRaService.invokePayload).toHaveBeenCalledWith({
      accessToken: 'idam-access-token',
      serviceToken: 's2s-token-value',
      body: {
        callbackUrl:
          'https://pcs.aat.platform.hmcts.net/case/1234123412341234/respond-to-claim/reasonable-adjustments/callback/:id',
        logoutUrl: 'https://pcs.aat.platform.hmcts.net/logout',
        language: 'en',
        existingFlags: { partyName: 'John Doe', roleOnCase: 'Defendant', details: [] },
        hmctsServiceId: 'AAA3',
        masterFlagCode: 'RA0001',
        correlationId: '1234123412341234',
      },
    });
  });

  it('pre-populates existingFlags from stored defendantFlags (CCD path { value } -> cui-ra { name })', async () => {
    const { req } = buildReq({
      res: {
        locals: {
          validatedCase: {
            id: '1234123412341234',
            defendantContactDetailsPartyName: 'John Doe',
            data: {
              possessionClaimResponse: {
                defendantFlags: {
                  partyName: 'John Doe',
                  roleOnCase: 'Defendant',
                  details: [
                    {
                      id: 'd1',
                      value: {
                        name: 'Language interpreter',
                        flagCode: 'RA0042',
                        path: [{ id: 'p1', value: 'Reasonable adjustment' }],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });

    await startYourSupport(req);

    expect(cuiRaService.invokePayload).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          existingFlags: {
            partyName: 'John Doe',
            roleOnCase: 'Defendant',
            details: [
              {
                id: 'd1',
                value: {
                  name: 'Language interpreter',
                  flagCode: 'RA0042',
                  path: [{ id: 'p1', name: 'Reasonable adjustment' }],
                },
              },
            ],
          },
        }),
      })
    );
  });

  it('falls back through the defendant name getters for partyName', async () => {
    const { req } = buildReq({
      res: {
        locals: {
          validatedCase: {
            id: '999',
            defendantContactDetailsPartyName: '',
            claimantEnteredDefendantDetailsName: 'Claimant Entered Name',
            defendantName: 'Fallback Name',
          },
        },
      },
    });

    await startYourSupport(req);

    expect(cuiRaService.invokePayload).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          existingFlags: expect.objectContaining({ partyName: 'Claimant Entered Name' }),
        }),
      })
    );
  });

  it('does not read party support while the response is still being prepared', async () => {
    const { req } = buildReq();

    await startYourSupport(req);

    expect(ccdCaseService.getDefendantSupport).not.toHaveBeenCalled();
  });

  describe('once the response has been submitted', () => {
    // Post-submit the respond START carries only the SUBMITTED marker (the draft is gone), so the
    // party's flags and pcs-api's name for the party come from the requestSupport START instead.
    const submittedCase = {
      id: '1234123412341234',
      defendantContactDetailsPartyName: '',
      claimantEnteredDefendantDetailsName: '',
      defendantName: 'John Doe',
      data: { possessionClaimResponse: { defendantResponses: { status: 'SUBMITTED' } } },
    };

    it('pre-populates existingFlags and partyName from the party support flags', async () => {
      (ccdCaseService.getDefendantSupport as jest.Mock).mockResolvedValue({
        partyId: 'party-1',
        supportFlags: {
          partyName: 'Jo Bloggs',
          roleOnCase: 'Defendant',
          details: [
            {
              id: 'f1',
              value: { name: 'Hearing loop', flagCode: 'RA0043', path: [{ id: 'p1', value: 'Reasonable adjustment' }] },
            },
          ],
        },
      });
      const { req } = buildReq({ res: { locals: { validatedCase: submittedCase } } });

      await startYourSupport(req);

      expect(ccdCaseService.getDefendantSupport).toHaveBeenCalledWith('idam-access-token', '1234123412341234');
      expect(cuiRaService.invokePayload).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            existingFlags: {
              partyName: 'Jo Bloggs',
              roleOnCase: 'Defendant',
              details: [
                {
                  id: 'f1',
                  value: {
                    name: 'Hearing loop',
                    flagCode: 'RA0043',
                    path: [{ id: 'p1', name: 'Reasonable adjustment' }],
                  },
                },
              ],
            },
          }),
        })
      );
    });

    it('falls back to the case defendant name when the party has no support flags yet', async () => {
      (ccdCaseService.getDefendantSupport as jest.Mock).mockResolvedValue({ partyId: 'party-1' });
      const { req } = buildReq({ res: { locals: { validatedCase: submittedCase } } });

      await startYourSupport(req);

      expect(cuiRaService.invokePayload).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            existingFlags: { partyName: 'John Doe', roleOnCase: 'Defendant', details: [] },
          }),
        })
      );
    });

    it('surfaces a failure to read party support so the caller can show the error page', async () => {
      (ccdCaseService.getDefendantSupport as jest.Mock).mockRejectedValue(new Error('ccd down'));
      const { req } = buildReq({ res: { locals: { validatedCase: submittedCase } } });

      await expect(startYourSupport(req)).rejects.toThrow('ccd down');
      expect(cuiRaService.invokePayload).not.toHaveBeenCalled();
    });
  });

  it('throws 401 when there is no access token', async () => {
    const { req } = buildReq({ session: { user: {} } });

    await expect(startYourSupport(req)).rejects.toMatchObject({ status: 401 });
    expect(cuiRaService.invokePayload).not.toHaveBeenCalled();
  });

  it('throws 400 when the validated case is not available', async () => {
    const { req } = buildReq({ res: { locals: {} } });

    await expect(startYourSupport(req)).rejects.toMatchObject({ status: 400 });
    expect(cuiRaService.invokePayload).not.toHaveBeenCalled();
  });

  it('throws 500 when the S2S service token is unavailable', async () => {
    mockGetValidS2SToken.mockRejectedValue(new Error('No valid S2S token available'));
    const { req } = buildReq();

    await expect(startYourSupport(req)).rejects.toMatchObject({ status: 500 });
    expect(cuiRaService.invokePayload).not.toHaveBeenCalled();
  });
});
