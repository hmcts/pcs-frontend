import express, { Express } from 'express';

import { I18n } from '../../../../main/modules/i18n';

jest.mock('i18next', () => {
  const mockUse = jest.fn().mockReturnThis();
  const mockInit = jest.fn();
  return {
    __esModule: true,
    default: {
      use: mockUse,
      init: mockInit,
      __mock__: { mockUse, mockInit },
    },
  };
});

jest.mock('i18next-fs-backend', () => ({}));
jest.mock('i18next-http-middleware', () => ({
  handle: jest.fn(() => 'mockMiddleware'),
  LanguageDetector: {},
}));

jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

describe('i18n module', () => {
  let mockApp: Express;
  let mockInit: jest.Mock;
  let mockUse: jest.Mock;

  beforeEach(() => {
    // Extract mocks from the i18next module
    const i18next = require('i18next').default;
    mockUse = i18next.__mock__.mockUse;
    mockInit = i18next.init;

    mockApp = express();
    mockApp.use = jest.fn();

    mockInit.mockReset();
    mockUse.mockClear();
  });

  it('should initialise i18next and register middleware', async () => {
    mockInit.mockImplementation((_, callback) => callback(null));

    const i18n = new I18n();
    i18n.enableFor(mockApp);

    await new Promise(resolve => setImmediate(resolve));

    expect(mockUse).toHaveBeenCalledTimes(2);
    expect(mockApp.use).toHaveBeenCalledWith('mockMiddleware');
  });

  it('should log and throw error on init failure', () => {
    const error = new Error('Init failed');
    mockInit.mockImplementation((_, callback) => callback(error));

    const i18n = new I18n();
    expect(() => i18n.enableFor(mockApp)).toThrow('Init failed');
  });
});
