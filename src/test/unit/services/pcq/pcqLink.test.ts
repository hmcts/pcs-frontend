import axios from 'axios';
import config from 'config';

import * as createSecureTokenModule from '@services/pcq/createSecureToken';
import { isPcqHealthy, pcqUrlFor } from '@services/pcq/pcqLink';

jest.mock('axios');
jest.mock('config');
jest.mock('@services/pcq/createSecureToken');

const CONFIG: Record<string, unknown> = {
  'pcq.url': 'https://pcq.test',
  'pcq.path': '/service-endpoint',
  'pcq.healthTimeoutMs': 3000,
  'secrets.pcs.pcs-pcq-token-key': 'key',
};

describe('pcqLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (config.get as jest.Mock).mockImplementation((key: string) => CONFIG[key]);
  });

  describe('isPcqHealthy', () => {
    it('is true when PCQ answers UP', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'UP' } });
      await expect(isPcqHealthy()).resolves.toBe(true);
      expect(axios.get).toHaveBeenCalledWith('https://pcq.test/health', { timeout: 3000 });
    });

    it('is false when PCQ answers anything else, or cannot be reached', async () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: { status: 'DOWN' } });
      await expect(isPcqHealthy()).resolves.toBe(false);
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('timeout'));
      await expect(isPcqHealthy()).resolves.toBe(false);
    });
  });

  describe('pcqUrlFor', () => {
    it('puts the invocation params and their secure token on the query string, encoded once', () => {
      (createSecureTokenModule.createSecureToken as jest.Mock).mockReturnValue({
        token: 'a+b=',
        authTag: 'tag',
        iv: 'iv',
        salt: 'salt',
      });
      const params = {
        serviceId: 'PCS',
        actor: 'APPLICANT',
        pcqId: 'id-1',
        partyId: 'party-1',
        returnUrl: 'pcs.test/case/1/make-a-claim/language-used',
        language: 'en',
        ccdCaseId: '1',
      };
      const url = new URL(pcqUrlFor(params));
      expect(createSecureTokenModule.createSecureToken).toHaveBeenCalledWith(params, 'key');
      expect(url.origin + url.pathname).toBe('https://pcq.test/service-endpoint');
      expect(Object.fromEntries(url.searchParams)).toEqual({
        ...params,
        token: 'a+b=',
        authTag: 'tag',
        iv: 'iv',
        salt: 'salt',
      });
    });
  });
});
