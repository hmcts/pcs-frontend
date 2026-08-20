import config from 'config';
import type { Request } from 'express';

import { http } from '@modules/http';
import { cuiRaService } from '@services/cuiRa/cuiRaService';
import { startYourSupport } from '@services/cuiRa/startYourSupport';

jest.mock('config', () => ({
  get: jest.fn(),
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
  'cuiRa.callbackUrl': 'http://frontend/case/:caseReference/respond-to-claim/reasonable-adjustments/callback/:id',
  'cuiRa.logoutUrl': 'http://frontend/logout',
  'cuiRa.hmctsServiceId': 'AAA3',
  'cuiRa.masterFlagCode': 'RA0001',
};

function buildReq(overrides: Record<string, unknown> = {}): { req: Request } {
  const req = {
    body: { reasonableAdjustmentsChoice: 'questions' },
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
        callbackUrl: 'http://frontend/case/1234123412341234/respond-to-claim/reasonable-adjustments/callback/:id',
        logoutUrl: 'http://frontend/logout',
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
