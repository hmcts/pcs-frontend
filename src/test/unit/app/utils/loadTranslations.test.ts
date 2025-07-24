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

import { loadTranslations } from '../../../../main/app/utils/loadTranslations';

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockLogger = require('@hmcts/nodejs-logging').Logger.getLogger();

describe('loadTranslations', () => {
  const basePath = path.resolve(__dirname, '../../../../main/public/locales/en');
  const commonContent = JSON.stringify({ title: 'Common Title' });
  const pageContent = JSON.stringify({ title: 'User Details Title' });

  beforeEach(() => {
    mockedFs.readFileSync.mockReset();
    mockLogger.error.mockReset();
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
