/* eslint-disable @typescript-eslint/no-explicit-any */
import fs, { promises as fsPromises } from 'fs';

import express, { Express } from 'express';
import type { TFunction } from 'i18next';

// ---- Mocks (must be declared before importing the SUT) ----
const mockUse = jest.fn().mockReturnThis();
const mockInit = jest.fn();
const mockI18n = {
  use: mockUse,
  init: mockInit,
  isInitialized: true,
};

const mockHandle = jest.fn(() => (req: any, _res: any, next: any) => next());
const mockLogger = { info: jest.fn(), error: jest.fn() };

jest.mock('i18next', () => ({
  __esModule: true,
  default: mockI18n,
}));

jest.mock('i18next-fs-backend', () => ({}), { virtual: true });

jest.mock(
  'i18next-http-middleware',
  () => ({
    __esModule: true,
    handle: mockHandle,
    LanguageDetector: {},
  }),
  { virtual: true }
);

jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

// Import SUT AFTER mocks
import {
  I18n,
  createFallbackTFunction,
  findLocalesDir,
  getCommonTranslations,
  getTranslationFunction,
  populateCommonTranslations,
  setupNunjucksGlobals,
} from '../../../../main/modules/i18n';

describe('i18n module', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    // spy so we can assert .use calls while still letting express accept functions
    jest.spyOn(app, 'use');
  });

  it('initialises i18next and registers middlewares', async () => {
    mockInit.mockImplementation((_opts: unknown, cb: (err: unknown) => void) => cb(null));

    const i18n = new I18n();
    i18n.enableFor(app);

    await new Promise(r => setImmediate(r));

    // i18next.use called twice (Backend + LanguageDetector)
    expect(mockUse).toHaveBeenCalledTimes(2);

    // Verify middlewares were registered
    expect((app.use as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    // First: i18next handle middleware (a function)
    expect((app.use as jest.Mock).mock.calls[0][0]).toEqual(expect.any(Function));
    // Second: our language-enforcement middleware (also a function)
    expect((app.use as jest.Mock).mock.calls[1][0]).toEqual(expect.any(Function));

    // Logged success
    expect(mockLogger.info).toHaveBeenCalledWith('[i18n] initialised OK');
  });

  it('logs (but does not throw) on init failure and still registers middlewares', async () => {
    const err = new Error('Init failed');
    mockInit.mockImplementation((_opts: unknown, cb: (err: unknown) => void) => cb(err));

    const i18n = new I18n();
    expect(() => i18n.enableFor(app)).not.toThrow();

    await new Promise(r => setImmediate(r));

    // Still registered both middlewares
    expect((app.use as jest.Mock).mock.calls[0][0]).toEqual(expect.any(Function));
    expect((app.use as jest.Mock).mock.calls[1][0]).toEqual(expect.any(Function));

    // Error was logged
    expect(mockLogger.error).toHaveBeenCalledWith('[i18n] init error', err);
  });
  it('middleware clamps language, calls changeLanguage, exposes t and sets nunjucks globals (valid lang)', async () => {
    // Make init succeed
    mockInit.mockImplementation((_opts: unknown, cb: (err: unknown) => void) => cb(null));

    const i18n = new I18n();
    i18n.enableFor(app);

    await new Promise(r => setImmediate(r));

    const langMw = (app.use as jest.Mock).mock.calls[1][0] as (req: any, res: any, next: any) => void;

    const changeLanguage = jest.fn();
    const addGlobal = jest.fn();

    const req = {
      language: 'cy',
      i18n: { changeLanguage },
      t: (key: string | string[], def?: string) => (Array.isArray(key) ? (def ?? key[0]) : (def ?? key)),
      app: { locals: { nunjucksEnv: { addGlobal } } },
      session: { user: { name: 'Alice' } },
    } as unknown as Parameters<typeof langMw>[0];

    const res = { locals: {} } as any;
    const next = jest.fn();

    langMw(req, res, next);

    // changeLanguage called with clamped 'cy'
    expect(changeLanguage).toHaveBeenCalledWith('cy');

    // res.locals populated
    expect(res.locals.lang).toBe('cy');
    expect(typeof res.locals.t).toBe('function');

    expect(res.locals.t('serviceName', 'Default Service')).toBe('Default Service');

    // nunjucks globals set
    expect(addGlobal).toHaveBeenCalledWith('lang', 'cy');
    expect(addGlobal).toHaveBeenCalledWith('t', expect.any(Function));

    // next called
    expect(next).toHaveBeenCalled();
  });

  it('middleware falls back to en and uses fallback t when req.t is missing (invalid lang)', async () => {
    mockInit.mockImplementation((_opts: unknown, cb: (err: unknown) => void) => cb(null));

    const i18n = new I18n();
    i18n.enableFor(app);

    await new Promise(r => setImmediate(r));

    const langMw = (app.use as jest.Mock).mock.calls[1][0] as (req: any, res: any, next: any) => void;

    const changeLanguage = jest.fn();
    const addGlobal = jest.fn();

    const req = {
      language: 'fr', // invalid -> should clamp to 'en'
      i18n: { changeLanguage },
      // no req.t -> middleware must provide fallback TFunction
      app: { locals: { nunjucksEnv: { addGlobal } } },
      session: {}, // no user
    } as unknown as Parameters<typeof langMw>[0];

    const res = { locals: {} } as { locals: Record<string, unknown> };
    const next = jest.fn();

    langMw(req, res, next);

    // Language clamped to 'en'
    expect(changeLanguage).toHaveBeenCalledWith('en');
    expect(res.locals.lang).toBe('en');

    // fallback t provided
    expect(typeof res.locals.t).toBe('function');
    // @ts-expect-error runtime call for test
    expect(res.locals.t('any.key', 'DEF')).toBe('DEF'); // returns defaultValue
    // @ts-expect-error runtime call for test
    expect(res.locals.t(['k1', 'k2'], undefined)).toBe('k1'); // returns first key when no default

    // nunjucks globals set (lang & t); no user global when absent
    expect(addGlobal).toHaveBeenCalledWith('lang', 'en');
    expect(addGlobal).toHaveBeenCalledWith('t', expect.any(Function));
    // ensure we did NOT push a user global
    expect(addGlobal).not.toHaveBeenCalledWith('user', expect.anything());

    expect(next).toHaveBeenCalled();
  });

  describe('findLocalesDir', () => {
    const originalEnv = process.env.LOCALES_DIR;

    afterEach(() => {
      process.env.LOCALES_DIR = originalEnv;
      jest.restoreAllMocks();
    });

    it('should return first existing path', async () => {
      const mockAccess = jest.spyOn(fsPromises, 'access').mockResolvedValue(undefined);

      const result = await findLocalesDir();

      expect(mockAccess).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it('should return null if no paths exist', async () => {
      jest.spyOn(fsPromises, 'access').mockRejectedValue(new Error('Not found'));

      const result = await findLocalesDir();

      expect(result).toBeNull();
    });

    it('should prioritize LOCALES_DIR env variable', async () => {
      process.env.LOCALES_DIR = '/custom/locales';
      const mockAccess = jest.spyOn(fsPromises, 'access').mockResolvedValue(undefined);

      await findLocalesDir();

      expect(mockAccess).toHaveBeenCalledWith('/custom/locales');
    });
  });

  describe('createFallbackTFunction', () => {
    it('should return key when no default value', () => {
      const t = createFallbackTFunction();
      expect(t('test.key')).toBe('test.key');
    });

    it('should return default value when provided', () => {
      const t = createFallbackTFunction();
      expect(t('test.key', 'Default')).toBe('Default');
    });

    it('should return first key when array provided', () => {
      const t = createFallbackTFunction();
      expect(t(['key1', 'key2'])).toBe('key1');
    });
  });

  describe('getTranslationFunction', () => {
    it('should return fallback when req.i18n is missing', () => {
      const req = {} as any;
      const t = getTranslationFunction(req);
      expect(t('test.key', 'Default')).toBe('Default');
    });

    it('should return fixedT when available', () => {
      const mockFixedT = jest.fn((key: string) => `translated:${key}`);
      const req = {
        i18n: { getFixedT: jest.fn(() => mockFixedT) },
        language: 'en',
      } as any;
      const t = getTranslationFunction(req);
      expect(t('test.key')).toBe('translated:test.key');
    });
  });

  describe('getCommonTranslations', () => {
    it('should return translations for common keys', () => {
      const mockT = jest.fn((key: string) => {
        const translations: Record<string, string> = {
          serviceName: 'Test Service',
          phase: 'BETA',
          feedback: 'Feedback',
          back: 'Back',
          languageToggle: 'Language',
          contactUsForHelp: 'Contact',
          contactUsForHelpText: 'Contact text',
        };
        return translations[key] || key;
      }) as unknown as TFunction;

      const result = getCommonTranslations(mockT);

      expect(result.serviceName).toBe('Test Service');
      expect(result.phase).toBe('BETA');
      expect(result.feedback).toBe('Feedback');
    });

    it('should exclude keys that return themselves', () => {
      const mockT = jest.fn((key: string) => key) as unknown as TFunction;

      const result = getCommonTranslations(mockT);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('populateCommonTranslations', () => {
    it('should populate res.locals with common translations', () => {
      const mockT = jest.fn((key: string) => {
        const translations: Record<string, string> = {
          serviceName: 'Test Service',
          phase: 'BETA',
        };
        return translations[key] || key;
      }) as unknown as TFunction;
      const req = {} as any;
      const res = { locals: {} } as any;

      populateCommonTranslations(req, res, mockT);

      expect(res.locals.serviceName).toBe('Test Service');
      expect(res.locals.phase).toBe('BETA');
    });

    it('should not overwrite existing res.locals values', () => {
      const mockT = jest.fn((key: string) => {
        const translations: Record<string, string> = {
          serviceName: 'New Service',
        };
        return translations[key] || key;
      }) as unknown as TFunction;
      const req = {} as any;
      const res = { locals: { serviceName: 'Existing Service' } } as any;

      populateCommonTranslations(req, res, mockT);

      expect(res.locals.serviceName).toBe('Existing Service');
    });
  });

  describe('setupNunjucksGlobals', () => {
    it('should add globals to nunjucks environment', () => {
      const addGlobal = jest.fn();
      const env = { addGlobal } as any;
      const globals = { lang: 'en', t: jest.fn() };

      setupNunjucksGlobals(env, globals);

      expect(addGlobal).toHaveBeenCalledWith('lang', 'en');
      expect(addGlobal).toHaveBeenCalledWith('t', globals.t);
    });

    it('should return early if env is undefined', () => {
      const globals = { lang: 'en', t: jest.fn() };

      expect(() => setupNunjucksGlobals(undefined, globals)).not.toThrow();
    });
  });

  describe('enableFor with no locales directory', () => {
    it('should log error and continue when no locales directory found', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      mockInit.mockImplementation((_opts: unknown, cb: (err: unknown) => void) => cb(null));

      const i18n = new I18n();
      i18n.enableFor(app);

      await new Promise(r => setImmediate(r));

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[i18n] No locales directory found. Set LOCALES_DIR or create src/main/public/locales.'
      );
    });

    it('should handle discoverNamespaces error gracefully', async () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readdirSync').mockImplementation(() => {
        throw new Error('Directory read failed');
      });

      mockInit.mockImplementation((_opts: unknown, cb: (err: unknown) => void) => cb(null));

      const i18n = new I18n();
      i18n.enableFor(app);

      await new Promise(r => setImmediate(r));

      expect(mockInit).toHaveBeenCalled();
      expect(mockInit.mock.calls[0][0]).toMatchObject({
        ns: ['common'],
      });
    });
  });
});
