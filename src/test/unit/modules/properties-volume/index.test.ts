import * as propertiesVolume from '@hmcts/properties-volume';
import config from 'config';

import { PropertiesVolume } from '@modules/properties-volume';

jest.mock('@hmcts/properties-volume', () => ({
  addTo: jest.fn(),
  addFromAzureVault: jest.fn(),
}));

jest.mock('config', () => ({
  has: jest.fn(),
  get: jest.fn(),
}));

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => ({
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

describe('PropertiesVolume Module', () => {
  const originalUseVault = process.env.USE_VAULT;
  const originalVaultEnv = process.env.VAULT_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    (config.has as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    process.env.USE_VAULT = originalUseVault;
    process.env.VAULT_ENV = originalVaultEnv;
  });

  describe('Production mode', () => {
    it('should load secrets from the mounted volume and skip Azure', async () => {
      const propsVolume = new PropertiesVolume(false);

      await propsVolume.enableFor();

      expect(propertiesVolume.addTo).toHaveBeenCalledWith(config);
      expect(propertiesVolume.addFromAzureVault).not.toHaveBeenCalled();
    });
  });

  describe('Development mode', () => {
    it('should load from Azure with omit configured to skip the redis connection string', async () => {
      delete process.env.USE_VAULT;
      delete process.env.VAULT_ENV;
      const propsVolume = new PropertiesVolume(true);

      await propsVolume.enableFor();

      expect(propertiesVolume.addFromAzureVault).toHaveBeenCalledTimes(1);
      const [, options] = (propertiesVolume.addFromAzureVault as jest.Mock).mock.calls[0];
      expect(options.omit).toEqual(['redis-connection-string']);
      expect(options.env).toBe('aat');
      expect(options.pathToHelmChart).toMatch(/charts\/pcs-frontend\/values\.yaml$/);
      expect(propertiesVolume.addTo).not.toHaveBeenCalled();
    });

    it('should honour VAULT_ENV when set', async () => {
      process.env.VAULT_ENV = 'preview';
      const propsVolume = new PropertiesVolume(true);

      await propsVolume.enableFor();

      const [, options] = (propertiesVolume.addFromAzureVault as jest.Mock).mock.calls[0];
      expect(options.env).toBe('preview');
    });

    it('should skip Azure entirely when USE_VAULT=false', async () => {
      process.env.USE_VAULT = 'false';
      const propsVolume = new PropertiesVolume(true);

      await propsVolume.enableFor();

      expect(propertiesVolume.addFromAzureVault).not.toHaveBeenCalled();
      expect(propertiesVolume.addTo).not.toHaveBeenCalled();
    });

    it('should swallow Azure failures so the app can fall back to .env', async () => {
      delete process.env.USE_VAULT;
      (propertiesVolume.addFromAzureVault as jest.Mock).mockRejectedValueOnce(new Error('az login required'));
      const propsVolume = new PropertiesVolume(true);

      await expect(propsVolume.enableFor()).resolves.toBeUndefined();
    });
  });

  describe('App Insights mapping', () => {
    it('should copy the app-insights connection string into appInsights.connectionString when present', async () => {
      (config.has as jest.Mock).mockImplementation(
        (key: string) => key === 'secrets.pcs' || key === 'secrets.pcs.app-insights-connection-string'
      );
      // lodash.get/set walk the actual object — populate the path the module reads from.
      (config as unknown as Record<string, unknown>).secrets = {
        pcs: { 'app-insights-connection-string': 'InstrumentationKey=abc' },
      };
      const propsVolume = new PropertiesVolume(false);

      await propsVolume.enableFor();

      expect((config as unknown as { appInsights: { connectionString: string } }).appInsights.connectionString).toBe(
        'InstrumentationKey=abc'
      );
    });

    it('should leave config alone when secrets.pcs is absent', async () => {
      (config.has as jest.Mock).mockReturnValue(false);
      const propsVolume = new PropertiesVolume(false);

      await propsVolume.enableFor();

      expect(config.get).not.toHaveBeenCalled();
    });
  });
});
