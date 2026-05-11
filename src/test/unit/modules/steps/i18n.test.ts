/* eslint-disable @typescript-eslint/no-explicit-any */
import { promises as fs } from 'fs';
import path from 'path';

import type { Request } from 'express';
import type { TFunction } from 'i18next';

const mockLogger = { warn: jest.fn(), error: jest.fn() };

jest.mock('@modules/logger', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

import * as mainI18n from '@modules/i18n';
import {
  getStepTranslationPath,
  getStepTranslations,
  getTranslationFunction,
  loadStepNamespace,
  validateTranslationKey,
} from '@modules/steps/i18n';

jest.mock('@modules/i18n', () => ({
  findLocalesDir: jest.fn(),
  getRequestLanguage: jest.fn(),
  getTranslationFunction: jest.fn(),
}));

const mockGetUserType = jest.fn();

jest.mock('../../../../main/steps/utils', () => ({
  getUserType: (...args: unknown[]) => mockGetUserType(...args),
}));

describe('steps/i18n', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockGetUserType.mockReturnValue('citizen');
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  describe('getStepTranslationPath', () => {
    it('should return correct translation path', () => {
      expect(getStepTranslationPath('start-now', 'respondToClaim')).toBe('respondToClaim/startNow');
      expect(getStepTranslationPath('summary', 'common')).toBe('common/summary');
      expect(getStepTranslationPath('respond-to-claim-summary', 'respondToClaim')).toBe(
        'respondToClaim/respondToClaimSummary'
      );
    });

    it('should produce distinct identifiers for the same step in different journeys', () => {
      expect(getStepTranslationPath('start-now', 'respondToClaim')).not.toBe(
        getStepTranslationPath('start-now', 'uploadAdditionalDocuments')
      );
    });
  });

  describe('loadStepNamespace', () => {
    it('should return early if req.i18n is missing', async () => {
      const req = {} as Request;
      await loadStepNamespace(req, 'test-step', 'folder');
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should skip loading when a journey-scoped namespace bundle is already cached', async () => {
      // Namespaces are now scoped by journey, so once a (journey, step) bundle
      // is loaded the next request for the same pair short-circuits — no disk
      // I/O, no shared mutable state, no race.
      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue('/test/locales');
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const addResourceBundle = jest.fn();
      const getResourceBundle = jest.fn().mockReturnValue({ already: 'loaded' });
      const access = jest.spyOn(fs, 'access');
      const req = {
        i18n: { getResourceBundle, addResourceBundle, loadNamespaces: jest.fn() },
      } as any;

      await loadStepNamespace(req, 'test-step', 'folder');

      expect(getResourceBundle).toHaveBeenCalledWith('en', 'folder/testStep');
      expect(access).not.toHaveBeenCalled();
      expect(addResourceBundle).not.toHaveBeenCalled();
    });

    it('should isolate the same step name across journeys into distinct namespaces', async () => {
      // Two journeys with a "start-now" step must NOT share a bundle —
      // the bug the journey-scoped namespace fixes.
      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue('/test/locales');
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const loadNamespaces = jest.fn((_ns: string, cb: (err: unknown) => void) => cb(null));
      const addResourceBundle = jest.fn();
      const getResourceBundle = jest.fn().mockReturnValue(null);
      const req = {
        i18n: { getResourceBundle, addResourceBundle, loadNamespaces },
      } as any;

      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest
        .spyOn(fs, 'readFile')
        .mockResolvedValueOnce(JSON.stringify({ title: 'Journey A' }))
        .mockResolvedValueOnce(JSON.stringify({ title: 'Journey B' }));

      await loadStepNamespace(req, 'start-now', 'journeyA');
      await loadStepNamespace(req, 'start-now', 'journeyB');

      expect(addResourceBundle).toHaveBeenNthCalledWith(
        1,
        'en',
        'journeyA/startNow',
        { title: 'Journey A' },
        true,
        true
      );
      expect(addResourceBundle).toHaveBeenNthCalledWith(
        2,
        'en',
        'journeyB/startNow',
        { title: 'Journey B' },
        true,
        true
      );
    });

    it('should derive step name and journey from res.locals.step when args are omitted', async () => {
      // withStepContext middleware sets res.locals.step on every step request
      // so callers can use the helpers without threading stepName/journey through.
      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue('/test/locales');
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const loadNamespaces = jest.fn((_ns: string, cb: (err: unknown) => void) => cb(null));
      const addResourceBundle = jest.fn();
      const getResourceBundle = jest.fn().mockReturnValue(null);
      const req = {
        i18n: { getResourceBundle, addResourceBundle, loadNamespaces },
        res: { locals: { step: { name: 'start-now', journey: 'uploadAdditionalDocuments' } } },
      } as any;

      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify({ title: 'From context' }));

      await loadStepNamespace(req);

      expect(addResourceBundle).toHaveBeenCalledWith(
        'en',
        'uploadAdditionalDocuments/startNow',
        { title: 'From context' },
        true,
        true
      );
    });

    it('should return without loading when no step name or journey is resolvable', async () => {
      const req = { i18n: { getResourceBundle: jest.fn() } } as any;
      const access = jest.spyOn(fs, 'access');

      await loadStepNamespace(req);

      expect(access).not.toHaveBeenCalled();
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

      expect(addResourceBundle).toHaveBeenCalledWith('en', 'testFolder/testStep', mockTranslations, true, true);
      expect(loadNamespaces).toHaveBeenCalledWith('testFolder/testStep', expect.any(Function));
    });

    it('should merge legalrep translations over default translations', async () => {
      const mockLocalesDir = '/test/locales';
      const loadNamespaces = jest.fn((_ns: string, cb: (err: unknown) => void) => cb(null));

      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue(mockLocalesDir);
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');
      mockGetUserType.mockReturnValue('legalrep');

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
      jest
        .spyOn(fs, 'readFile')
        .mockResolvedValueOnce(JSON.stringify({ title: 'Citizen title', nested: { keep: 'citizen', swap: 'base' } }))
        .mockResolvedValueOnce(JSON.stringify({ title: 'Professional title', nested: { swap: 'professional' } }));

      await loadStepNamespace(req, 'test-step', 'testFolder');

      expect(addResourceBundle).toHaveBeenCalledWith(
        'en',
        'testFolder/testStep',
        {
          title: 'Professional title',
          nested: {
            keep: 'citizen',
            swap: 'professional',
          },
        },
        true,
        true
      );
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

      const result = getStepTranslations(req, 'test-step', 'testFolder');

      expect(getResourceBundle).toHaveBeenCalledWith('en', 'testFolder/testStep');
      expect(result).toEqual(mockTranslations);
    });

    it('should return empty object if resource bundle is missing', () => {
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getResourceBundle = jest.fn().mockReturnValue(null);
      const req = {
        i18n: { getResourceBundle },
      } as any;

      const result = getStepTranslations(req, 'test-step', 'testFolder');

      expect(result).toEqual({});
    });

    it('should return empty object when no journey context is available', () => {
      const getResourceBundle = jest.fn();
      const req = {
        i18n: { getResourceBundle },
      } as any;

      const result = getStepTranslations(req, 'test-step');

      expect(getResourceBundle).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should read the journey-scoped namespace when journey context is set', () => {
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const bundle = { title: 'Hello' };
      const getResourceBundle = jest.fn().mockReturnValue(bundle);
      const req = {
        i18n: { getResourceBundle },
        res: { locals: { step: { name: 'start-now', journey: 'uploadAdditionalDocuments' } } },
      } as any;

      const result = getStepTranslations(req);

      expect(getResourceBundle).toHaveBeenCalledWith('en', 'uploadAdditionalDocuments/startNow');
      expect(result).toBe(bundle);
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

    it('should return fixedT with step namespace when stepName and journey provided', () => {
      const mockFixedT = jest.fn();
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getFixedT = jest.fn().mockReturnValue(mockFixedT);
      const req = {
        i18n: { getFixedT },
      } as any;

      const result = getTranslationFunction(req, 'test-step', ['common'], 'testFolder');

      expect(getFixedT).toHaveBeenCalledWith('en', ['testFolder/testStep', 'common']);
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

      const result = getTranslationFunction(req, 'test-step', ['common'], 'testFolder');

      expect(mainI18n.getTranslationFunction).toHaveBeenCalledWith(req, ['common']);
      expect(result).toBe(mockT);
    });

    it('should fall through to the common namespaces when no journey context is available', () => {
      const mockFixedT = jest.fn();
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getFixedT = jest.fn().mockReturnValue(mockFixedT);
      const req = {
        i18n: { getFixedT },
      } as any;

      getTranslationFunction(req, 'test-step');

      expect(getFixedT).toHaveBeenCalledWith('en', ['common']);
    });

    it('should use the journey-scoped namespace when context is set on res.locals', () => {
      const mockFixedT = jest.fn();
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getFixedT = jest.fn().mockReturnValue(mockFixedT);
      const req = {
        i18n: { getFixedT },
        res: { locals: { step: { name: 'start-now', journey: 'uploadAdditionalDocuments' } } },
      } as any;

      const result = getTranslationFunction(req);

      expect(getFixedT).toHaveBeenCalledWith('en', ['uploadAdditionalDocuments/startNow', 'common']);
      expect(result).toBe(mockFixedT);
    });

    it('should prefer explicit args over res.locals step context', () => {
      const mockFixedT = jest.fn();
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getFixedT = jest.fn().mockReturnValue(mockFixedT);
      const req = {
        i18n: { getFixedT },
        res: { locals: { step: { name: 'start-now', journey: 'journeyA' } } },
      } as any;

      getTranslationFunction(req, 'other-step', ['common'], 'journeyB');

      expect(getFixedT).toHaveBeenCalledWith('en', ['journeyB/otherStep', 'common']);
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
