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
});
