import fs from 'fs';
import path from 'path';

// Mock logger BEFORE importing loadTranslations
jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn(() => ({
      error: jest.fn(),
    })),
  },
}));

jest.mock('fs');

import { loadTranslations } from '../../../../main/app/utils/i18n';

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockLogger = require('@hmcts/nodejs-logging').Logger.getLogger();

describe('loadTranslations', () => {
  const localesDir = path.resolve(__dirname, '../../../../main/public/locales');
  const basePath = path.join(localesDir, 'en');
  const commonContent = JSON.stringify({ title: 'Common Title' });
  const pageContent = JSON.stringify({ title: 'User Details Title' });

  beforeEach(() => {
    mockedFs.readFileSync.mockReset();
    mockedFs.existsSync.mockReset();
    mockLogger.error.mockReset();

    // Mock findLocalesDir - it checks for the locales directory (without language subdirectory)
    mockedFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
      const file = filePath.toString();
      // Return true if it's the locales directory itself (not a subdirectory)
      return file === localesDir || file.replace(/\\/g, '/').endsWith('/public/locales');
    });
  });

  it('should load translations from given namespaces', () => {
    mockedFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const file = filePath.toString();
      if (file === path.join(basePath, 'common.json')) {
        return commonContent;
      }
      if (file === path.join(basePath, 'enterUserDetails.json')) {
        return pageContent;
      }
      throw new Error('Unexpected path');
    });

    const result = loadTranslations('en', ['common', 'enterUserDetails']);

    expect(result).toEqual({
      title: 'User Details Title',
    });

    expect(mockedFs.readFileSync).toHaveBeenCalledTimes(2);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
