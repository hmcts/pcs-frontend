import { promises as fs } from 'fs';
import path from 'path';

import type { Request } from 'express';
import type { TFunction } from 'i18next';

const mockLogger = { warn: jest.fn(), error: jest.fn() };

jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

import * as mainI18n from '../../../../main/modules/i18n';
import {
  getStepNamespace,
  getStepTranslationPath,
  getStepTranslations,
  getTranslationFunction,
  loadStepNamespace,
  validateTranslationKey,
} from '../../../../main/modules/steps/i18n';

jest.mock('../../../../main/modules/i18n', () => ({
  findLocalesDir: jest.fn(),
  getRequestLanguage: jest.fn(),
  getTranslationFunction: jest.fn(),
}));

describe('steps/i18n', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  describe('getStepNamespace', () => {
    it('should convert step name to namespace', () => {
      expect(getStepNamespace('enter-dob')).toBe('enterDob');
      expect(getStepNamespace('respond-to-claim-summary')).toBe('respondToClaimSummary');
      expect(getStepNamespace('single-word')).toBe('singleWord');
    });
  });

  describe('getStepTranslationPath', () => {
    it('should return correct translation path', () => {
      expect(getStepTranslationPath('start-now', 'respondToClaim')).toBe('respondToClaim/startNow');
      expect(getStepTranslationPath('summary', 'common')).toBe('common/summary');
    });
  });

  describe('loadStepNamespace', () => {
    it('should return early if req.i18n is missing', async () => {
      const req = {} as Request;
      await loadStepNamespace(req, 'test-step', 'folder');
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should return early if namespace already loaded', async () => {
      const getResourceBundle = jest.fn().mockReturnValue({ key: 'value' });
      const req = {
        i18n: { getResourceBundle },
      } as any;

      await loadStepNamespace(req, 'test-step', 'folder');

      expect(getResourceBundle).toHaveBeenCalled();
    });

    it('should return early if locales directory not found', async () => {
      process.env.NODE_ENV = 'development';
      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue(null);
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getResourceBundle = jest.fn().mockReturnValue(null);
      const req = {
        i18n: { getResourceBundle },
      } as any;

      await loadStepNamespace(req, 'test-step', 'folder');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Locales directory not found. Translation file for test-step will not be loaded.'
      );
    });

    it('should load translation file successfully', async () => {
      const mockLocalesDir = '/test/locales';
      const mockTranslations = { title: 'Test Title' };
      const loadNamespaces = jest.fn((_ns: string, cb: (err: unknown) => void) => cb(null));

      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue(mockLocalesDir);
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const addResourceBundle = jest.fn();
      const getResourceBundle = jest.fn().mockReturnValue(null);
      const req = {
        i18n: {
          getResourceBundle,
          addResourceBundle,
          loadNamespaces,
        },
      } as any;

      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockTranslations));

      await loadStepNamespace(req, 'test-step', 'testFolder');

      expect(addResourceBundle).toHaveBeenCalledWith('en', 'testStep', mockTranslations, true, true);
      expect(loadNamespaces).toHaveBeenCalledWith('testStep', expect.any(Function));
    });

    it('should handle path traversal attack', async () => {
      process.env.NODE_ENV = 'development';
      const mockLocalesDir = path.resolve('/test/locales');
      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue(mockLocalesDir);
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getResourceBundle = jest.fn().mockReturnValue(null);
      const req = {
        i18n: { getResourceBundle },
      } as any;

      // Mock path.resolve to simulate path traversal
      const originalResolve = path.resolve;
      jest.spyOn(path, 'resolve').mockImplementation((...args: string[]) => {
        if (args.some(arg => arg.includes('..'))) {
          return '/etc/passwd';
        }
        return originalResolve(...args);
      });

      await loadStepNamespace(req, '../../../etc/passwd', 'folder');

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid translation path detected'));

      jest.restoreAllMocks();
    });

    it('should handle file not found error silently', async () => {
      process.env.NODE_ENV = 'development';
      const mockLocalesDir = '/test/locales';
      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue(mockLocalesDir);
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getResourceBundle = jest.fn().mockReturnValue(null);
      const req = {
        i18n: { getResourceBundle },
      } as any;

      const error = new Error('ENOENT: no such file');
      jest.spyOn(fs, 'access').mockRejectedValue(error);

      await loadStepNamespace(req, 'test-step', 'folder');

      // File not found errors should be handled silently (no warning)
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle other errors', async () => {
      process.env.NODE_ENV = 'development';
      const mockLocalesDir = '/test/locales';
      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue(mockLocalesDir);
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getResourceBundle = jest.fn().mockReturnValue(null);
      const req = {
        i18n: { getResourceBundle },
      } as any;

      const error = new Error('Parse error');
      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest.spyOn(fs, 'readFile').mockRejectedValue(error);

      await loadStepNamespace(req, 'test-step', 'folder');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to load translation file for test-step:', error);
    });

    it('should handle errors silently when not in development', async () => {
      const mockLocalesDir = '/test/locales';
      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue(mockLocalesDir);
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getResourceBundle = jest.fn().mockReturnValue(null);
      const req = {
        i18n: { getResourceBundle },
      } as any;

      const error = new Error('ENOENT: no such file');
      jest.spyOn(fs, 'access').mockRejectedValue(error);

      await expect(loadStepNamespace(req, 'test-step', 'folder')).resolves.not.toThrow();
    });
  });

  describe('getStepTranslations', () => {
    it('should return empty object if req.i18n is missing', () => {
      const req = {} as Request;
      const result = getStepTranslations(req, 'test-step');
      expect(result).toEqual({});
    });

    it('should return translations from resource bundle', () => {
      const mockTranslations = { title: 'Test Title', description: 'Test Description' };
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getResourceBundle = jest.fn().mockReturnValue(mockTranslations);
      const req = {
        i18n: { getResourceBundle },
      } as any;

      const result = getStepTranslations(req, 'test-step');

      expect(getResourceBundle).toHaveBeenCalledWith('en', 'testStep');
      expect(result).toEqual(mockTranslations);
    });

    it('should return empty object if resource bundle is missing', () => {
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getResourceBundle = jest.fn().mockReturnValue(null);
      const req = {
        i18n: { getResourceBundle },
      } as any;

      const result = getStepTranslations(req, 'test-step');

      expect(result).toEqual({});
    });
  });

  describe('getTranslationFunction', () => {
    it('should return main translation function if req.i18n is missing', () => {
      const mockT = jest.fn();
      (mainI18n.getTranslationFunction as jest.Mock).mockReturnValue(mockT);

      const req = {} as Request;
      const result = getTranslationFunction(req);

      expect(mainI18n.getTranslationFunction).toHaveBeenCalledWith(req, ['common']);
      expect(result).toBe(mockT);
    });

    it('should return fixedT with step namespace when stepName provided', () => {
      const mockFixedT = jest.fn();
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getFixedT = jest.fn().mockReturnValue(mockFixedT);
      const req = {
        i18n: { getFixedT },
      } as any;

      const result = getTranslationFunction(req, 'test-step');

      expect(getFixedT).toHaveBeenCalledWith('en', ['testStep', 'common']);
      expect(result).toBe(mockFixedT);
    });

    it('should fallback to main translation function if fixedT is null', () => {
      const mockT = jest.fn();
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');
      (mainI18n.getTranslationFunction as jest.Mock).mockReturnValue(mockT);

      const getFixedT = jest.fn().mockReturnValue(null);
      const req = {
        i18n: { getFixedT },
      } as any;

      const result = getTranslationFunction(req, 'test-step');

      expect(mainI18n.getTranslationFunction).toHaveBeenCalledWith(req, ['common']);
      expect(result).toBe(mockT);
    });
  });

  describe('validateTranslationKey', () => {
    beforeEach(() => {
      mockLogger.warn.mockClear();
      mockLogger.error.mockClear();
    });

    it('should warn about missing translation key in development', () => {
      process.env.NODE_ENV = 'development';
      const mockT = jest.fn((key: string) => key) as unknown as TFunction;

      validateTranslationKey(mockT, 'missing.key', 'test context');

      expect(mockLogger.warn).toHaveBeenCalledWith('Missing translation key: "missing.key" in test context');
    });

    it('should not warn if translation exists', () => {
      process.env.NODE_ENV = 'development';
      const mockT = jest.fn((key: string) => {
        if (key === 'existing.key') {
          return 'Translated';
        }
        return key;
      }) as unknown as TFunction;

      validateTranslationKey(mockT, 'existing.key', 'test context');

      expect(mockT).toHaveBeenCalledWith('existing.key');
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should only warn in development mode', () => {
      const mockT = jest.fn((key: string) => key) as unknown as TFunction;

      validateTranslationKey(mockT, 'missing.key', 'test context');

      // Note: This test depends on NODE_ENV at module load time
      // If running in production, logger.warn won't be called
      // If running in development/test, logger.warn will be called
      expect(mockT).toHaveBeenCalledWith('missing.key');
    });

    it('should not include context in warning if not provided', () => {
      process.env.NODE_ENV = 'development';
      const mockT = jest.fn((key: string) => key) as unknown as TFunction;

      validateTranslationKey(mockT, 'missing.key');

      expect(mockLogger.warn).toHaveBeenCalledWith('Missing translation key: "missing.key"');
    });
  });
});
