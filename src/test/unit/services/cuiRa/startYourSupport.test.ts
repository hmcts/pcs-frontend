import config from 'config';
import type { Request } from 'express';

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

const configValues: Record<string, string> = {
  's2s.key': 's2s:service-token',
  'cuiRa.callbackUrl': 'http://frontend/case/:caseReference/respond-to-claim/reasonable-adjustments/callback/:id',
  'cuiRa.logoutUrl': 'http://frontend/logout',
  'cuiRa.hmctsServiceId': 'AAA3',
  'cuiRa.masterFlagCode': 'RA0001',
};

function buildReq(overrides: Record<string, unknown> = {}): { req: Request; redisGet: jest.Mock } {
  const redisGet = jest.fn().mockResolvedValue('s2s-token-value');
  const req = {
    body: { reasonableAdjustmentsChoice: 'questions' },
    session: { user: { accessToken: 'idam-access-token' } },
    app: { locals: { redisClient: { get: redisGet } } },
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
  return { req, redisGet };
}

describe('startYourSupport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (config.get as jest.Mock).mockImplementation((key: string) => configValues[key]);
    (cuiRaService.invokePayload as jest.Mock).mockResolvedValue('https://cui-ra/microsite/xyz');
  });

  it('builds the invocation payload from the case and returns the microsite url', async () => {
    const { req, redisGet } = buildReq();

    const url = await startYourSupport(req);

    expect(url).toBe('https://cui-ra/microsite/xyz');
    expect(redisGet).toHaveBeenCalledWith('s2s:service-token');
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
    const { req } = buildReq({ app: { locals: { redisClient: { get: jest.fn().mockResolvedValue(null) } } } });

    await expect(startYourSupport(req)).rejects.toMatchObject({ status: 500 });
    expect(cuiRaService.invokePayload).not.toHaveBeenCalled();
  });
});
