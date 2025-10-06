import express, { Express } from 'express';

// ---- Mocks (must be declared before importing the SUT) ----
const mockUse = jest.fn().mockReturnThis();
const mockInit = jest.fn();
const mockI18n = {
  use: mockUse,
  init: mockInit,
  isInitialized: true,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
import { I18n } from '../../../../main/modules/i18n';

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

    // handle() was asked for a middleware
    expect(mockHandle).toHaveBeenCalledWith(expect.any(Object));

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
});
