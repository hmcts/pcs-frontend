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

interface ReqOverrides {
  i18n?: Record<string, unknown>;
  step?: { name: string; journey: string };
}

function buildReq({ i18n, step }: ReqOverrides = {}): Request {
  return {
    ...(i18n !== undefined ? { i18n } : {}),
    res: step ? { locals: { step } } : { locals: {} },
  } as unknown as Request;
}

const stepContext = { name: 'test-step', journey: 'testFolder' };

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
      await loadStepNamespace(buildReq({ step: stepContext }));
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should return without loading when res.locals.step is not set', async () => {
      const access = jest.spyOn(fs, 'access');
      await loadStepNamespace(buildReq({ i18n: { getResourceBundle: jest.fn() } }));
      expect(access).not.toHaveBeenCalled();
    });

    it('should skip loading when a journey-scoped namespace bundle is already cached', async () => {
      // Namespaces are scoped by journey, so once a (journey, step) bundle
      // is loaded the next request for the same pair short-circuits — no disk
      // I/O, no shared mutable state, no race.
      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue('/test/locales');
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const addResourceBundle = jest.fn();
      const getResourceBundle = jest.fn().mockReturnValue({ already: 'loaded' });
      const access = jest.spyOn(fs, 'access');
      const req = buildReq({
        i18n: { getResourceBundle, addResourceBundle, loadNamespaces: jest.fn() },
        step: { name: 'test-step', journey: 'folder' },
      });

      await loadStepNamespace(req);

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
      const i18n = { getResourceBundle, addResourceBundle, loadNamespaces };

      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest
        .spyOn(fs, 'readFile')
        .mockResolvedValueOnce(JSON.stringify({ title: 'Journey A' }))
        .mockResolvedValueOnce(JSON.stringify({ title: 'Journey B' }));

      await loadStepNamespace(buildReq({ i18n, step: { name: 'start-now', journey: 'journeyA' } }));
      await loadStepNamespace(buildReq({ i18n, step: { name: 'start-now', journey: 'journeyB' } }));

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

    it('should return early if locales directory not found', async () => {
      process.env.NODE_ENV = 'development';
      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue(null);
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const req = buildReq({ i18n: { getResourceBundle: jest.fn().mockReturnValue(null) }, step: stepContext });

      await loadStepNamespace(req);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Locales directory not found. Translation file for test-step will not be loaded.'
      );
    });

    it('should load translation file successfully', async () => {
      const mockTranslations = { title: 'Test Title' };
      const loadNamespaces = jest.fn((_ns: string, cb: (err: unknown) => void) => cb(null));

      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue('/test/locales');
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const addResourceBundle = jest.fn();
      const req = buildReq({
        i18n: { getResourceBundle: jest.fn().mockReturnValue(null), addResourceBundle, loadNamespaces },
        step: stepContext,
      });

      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockTranslations));

      await loadStepNamespace(req);

      expect(addResourceBundle).toHaveBeenCalledWith('en', 'testFolder/testStep', mockTranslations, true, true);
      expect(loadNamespaces).toHaveBeenCalledWith('testFolder/testStep', expect.any(Function));
    });

    it('should merge legalrep translations over default translations', async () => {
      const loadNamespaces = jest.fn((_ns: string, cb: (err: unknown) => void) => cb(null));

      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue('/test/locales');
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');
      mockGetUserType.mockReturnValue('legalrep');

      const addResourceBundle = jest.fn();
      const req = buildReq({
        i18n: { getResourceBundle: jest.fn().mockReturnValue(null), addResourceBundle, loadNamespaces },
        step: stepContext,
      });

      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest
        .spyOn(fs, 'readFile')
        .mockResolvedValueOnce(JSON.stringify({ title: 'Citizen title', nested: { keep: 'citizen', swap: 'base' } }))
        .mockResolvedValueOnce(JSON.stringify({ title: 'Professional title', nested: { swap: 'professional' } }));

      await loadStepNamespace(req);

      expect(addResourceBundle).toHaveBeenCalledWith(
        'en',
        'testFolder/legalrep/testStep',
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

      const req = buildReq({
        i18n: { getResourceBundle: jest.fn().mockReturnValue(null) },
        step: { name: '../../../etc/passwd', journey: 'folder' },
      });

      const originalResolve = path.resolve;
      jest.spyOn(path, 'resolve').mockImplementation((...args: string[]) => {
        if (args.some(arg => arg.includes('..'))) {
          return '/etc/passwd';
        }
        return originalResolve(...args);
      });

      await loadStepNamespace(req);

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid translation path detected'));

      jest.restoreAllMocks();
    });

    it('should handle file not found error silently', async () => {
      process.env.NODE_ENV = 'development';
      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue('/test/locales');
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const req = buildReq({ i18n: { getResourceBundle: jest.fn().mockReturnValue(null) }, step: stepContext });

      jest.spyOn(fs, 'access').mockRejectedValue(new Error('ENOENT: no such file'));

      await loadStepNamespace(req);

      // File not found errors should be handled silently (no warning)
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle other errors', async () => {
      process.env.NODE_ENV = 'development';
      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue('/test/locales');
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const req = buildReq({ i18n: { getResourceBundle: jest.fn().mockReturnValue(null) }, step: stepContext });

      const error = new Error('Parse error');
      jest.spyOn(fs, 'access').mockResolvedValue(undefined);
      jest.spyOn(fs, 'readFile').mockRejectedValue(error);

      await loadStepNamespace(req);

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to load translation file for test-step:', error);
    });

    it('should handle errors silently when not in development', async () => {
      (mainI18n.findLocalesDir as jest.Mock).mockResolvedValue('/test/locales');
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const req = buildReq({ i18n: { getResourceBundle: jest.fn().mockReturnValue(null) }, step: stepContext });

      jest.spyOn(fs, 'access').mockRejectedValue(new Error('ENOENT: no such file'));

      await expect(loadStepNamespace(req)).resolves.not.toThrow();
    });
  });

  describe('getStepTranslations', () => {
    it('should return empty object if req.i18n is missing', () => {
      expect(getStepTranslations(buildReq({ step: stepContext }))).toEqual({});
    });

    it('should return empty object when no step context is set', () => {
      const getResourceBundle = jest.fn();
      const result = getStepTranslations(buildReq({ i18n: { getResourceBundle } }));

      expect(getResourceBundle).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should return translations from the journey-scoped resource bundle', () => {
      const mockTranslations = { title: 'Test Title', description: 'Test Description' };
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getResourceBundle = jest.fn().mockReturnValue(mockTranslations);
      const req = buildReq({ i18n: { getResourceBundle }, step: stepContext });

      const result = getStepTranslations(req);

      expect(getResourceBundle).toHaveBeenCalledWith('en', 'testFolder/testStep');
      expect(result).toEqual(mockTranslations);
    });

    it('should return empty object if resource bundle is missing', () => {
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const req = buildReq({ i18n: { getResourceBundle: jest.fn().mockReturnValue(null) }, step: stepContext });

      expect(getStepTranslations(req)).toEqual({});
    });
  });

  describe('getTranslationFunction', () => {
    it('should return main translation function if req.i18n is missing', () => {
      const mockT = jest.fn();
      (mainI18n.getTranslationFunction as jest.Mock).mockReturnValue(mockT);

      const req = buildReq({ step: stepContext });
      const result = getTranslationFunction(req);

      expect(mainI18n.getTranslationFunction).toHaveBeenCalledWith(req, ['common']);
      expect(result).toBe(mockT);
    });

    it('should use the journey-scoped namespace when context is set', () => {
      const mockFixedT = jest.fn();
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getFixedT = jest.fn().mockReturnValue(mockFixedT);
      const req = buildReq({
        i18n: { getFixedT },
        step: { name: 'start-now', journey: 'uploadAdditionalDocuments' },
      });

      const result = getTranslationFunction(req, 'test-step', ['common'], 'testFolder');

      expect(getFixedT).toHaveBeenCalledWith('en', ['testFolder/testStep', 'common']);
      expect(result).toBe(mockFixedT);
    });

    it('should return fixedT with legalrep namespace when user is legalrep', () => {
      const mockFixedT = jest.fn();
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');
      mockGetUserType.mockReturnValue('legalrep');

      const getFixedT = jest.fn().mockReturnValue(mockFixedT);

      const req = {
        i18n: { getFixedT },
      } as any;

      const result = getTranslationFunction(req, 'test-step', ['common'], 'testFolder');

      expect(getFixedT).toHaveBeenCalledWith('en', ['testFolder/legalrep/testStep', 'common']);
      expect(result).toBe(mockFixedT);
    });

    it('should fall through to the common-only namespaces when no step context is set', () => {
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getFixedT = jest.fn().mockReturnValue(jest.fn());
      getTranslationFunction(buildReq({ i18n: { getFixedT } }));

      expect(getFixedT).toHaveBeenCalledWith('en', ['common']);
    });

    it('should pass through additional namespaces alongside the step namespace', () => {
      const mockFixedT = jest.fn();
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');

      const getFixedT = jest.fn().mockReturnValue(mockFixedT);
      const req = buildReq({ i18n: { getFixedT }, step: stepContext });

      getTranslationFunction(req, ['common', 'dashboard']);

      expect(getFixedT).toHaveBeenCalledWith('en', ['testFolder/testStep', 'common', 'dashboard']);
    });

    it('should fallback to main translation function if fixedT is null', () => {
      const mockT = jest.fn();
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');
      (mainI18n.getTranslationFunction as jest.Mock).mockReturnValue(mockT);

      const getFixedT = jest.fn().mockReturnValue(null);
      const req = buildReq({ i18n: { getFixedT }, step: stepContext });

      const result = getTranslationFunction(req);

      expect(mainI18n.getTranslationFunction).toHaveBeenCalledWith(req, ['common']);
      expect(result).toBe(mockT);
    });
  });

  describe('getTranslationFunction with step context', () => {
    it('should use step namespace from req.res.locals.step when journeyFolder is not passed', () => {
      const mockFixedT = jest.fn();
      (mainI18n.getRequestLanguage as jest.Mock).mockReturnValue('en');
      const getFixedT = jest.fn().mockReturnValue(mockFixedT);

      const req = {
        i18n: { getFixedT },
        res: { locals: { step: { journey: 'testFolder' } } },
      } as any;

      const result = getTranslationFunction(req, 'test-step');

      expect(getFixedT).toHaveBeenCalledWith('en', ['testFolder/testStep', 'common']);
      expect(result).toBe(mockFixedT);
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

      // Depends on NODE_ENV at module load time
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
