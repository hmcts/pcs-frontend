import fs from 'fs';
import path from 'path';

import type { Request } from 'express';

const mockError = jest.fn();
const mockLogger = {
  error: mockError,
};

jest.mock('@hmcts/nodejs-logging', () => ({
  Logger: {
    getLogger: jest.fn(() => mockLogger),
  },
}));

jest.mock('fs');

import { createGenerateContent, getValidatedLanguage, loadTranslations } from '../../../../main/app/utils/i18n';

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('i18n', () => {
  describe('getValidatedLanguage', () => {
    it('should return language from req.language when valid', () => {
      const req = {
        language: 'en',
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('en');
    });

    it('should return language from req.language when valid (Welsh)', () => {
      const req = {
        language: 'cy',
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('cy');
    });

    it('should handle case-insensitive language from req.language', () => {
      const req = {
        language: 'EN',
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('en');
    });

    it('should return language from query parameter', () => {
      const req = {
        query: { lang: 'cy' },
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('cy');
    });

    it('should return language from query parameter array', () => {
      const req = {
        query: { lang: ['cy'] },
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('cy');
    });

    it('should return language from body', () => {
      const req = {
        body: { lang: 'cy' },
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('cy');
    });

    it('should prioritize req.language over query parameter', () => {
      const req = {
        language: 'en',
        query: { lang: 'cy' },
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('en');
    });

    it('should prioritize query parameter over body', () => {
      const req = {
        query: { lang: 'cy' },
        body: { lang: 'en' },
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('cy');
    });

    it('should return default "en" when no language provided', () => {
      const req = {} as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('en');
    });

    it('should return default "en" when invalid language provided', () => {
      const req = {
        query: { lang: 'fr' },
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('en');
    });

    it('should handle empty string in query', () => {
      const req = {
        query: { lang: '' },
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('en');
    });

    it('should handle whitespace in query', () => {
      const req = {
        query: { lang: '  cy  ' },
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('cy');
    });

    it('should handle invalid req.language', () => {
      const req = {
        language: 'fr',
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('en');
    });

    it('should handle non-string query.lang', () => {
      const req = {
        query: { lang: 123 },
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('en');
    });

    it('should handle non-string body.lang', () => {
      const req = {
        body: { lang: 123 },
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('en');
    });

    it('should handle array with non-string first element', () => {
      const req = {
        query: { lang: [123] },
      } as unknown as Request;

      const result = getValidatedLanguage(req);
      expect(result).toBe('en');
    });
  });

  describe('loadTranslations', () => {
    beforeEach(() => {
      mockedFs.readFileSync.mockReset();
      mockedFs.existsSync.mockReset();
      mockError.mockReset();
    });

    it('should return empty object when locales directory not found', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = loadTranslations('en', ['common']);

      expect(result).toEqual({});
      expect(mockError).toHaveBeenCalledWith('No locales directory found. Translations will be empty.');
    });

    it('should load translations from multiple namespaces', () => {
      const localesDir = path.resolve(__dirname, '../../../../main/public/locales');
      const basePath = path.join(localesDir, 'en');

      mockedFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const file = filePath.toString();
        return file === localesDir || file.replace(/\\/g, '/').endsWith('/public/locales');
      });

      mockedFs.readFileSync.mockImplementation(filePath => {
        const file = filePath.toString();
        if (file === path.join(basePath, 'common.json')) {
          return JSON.stringify({ commonKey: 'commonValue' });
        }
        if (file === path.join(basePath, 'test.json')) {
          return JSON.stringify({ testKey: 'testValue' });
        }
        throw new Error('Unexpected path');
      });

      const result = loadTranslations('en', ['common', 'test']);

      expect(result).toEqual({
        commonKey: 'commonValue',
        testKey: 'testValue',
      });
    });

    it('should handle file read errors gracefully', () => {
      const localesDir = path.resolve(__dirname, '../../../../main/public/locales');
      const basePath = path.join(localesDir, 'en');

      mockedFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const file = filePath.toString();
        return file === localesDir || file.replace(/\\/g, '/').endsWith('/public/locales');
      });

      mockedFs.readFileSync.mockImplementation(filePath => {
        const file = filePath.toString();
        if (file === path.join(basePath, 'common.json')) {
          return JSON.stringify({ commonKey: 'commonValue' });
        }
        if (file === path.join(basePath, 'error.json')) {
          throw new Error('File read error');
        }
        throw new Error('Unexpected path');
      });

      const result = loadTranslations('en', ['common', 'error']);

      expect(result).toEqual({
        commonKey: 'commonValue',
      });
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Failed to load translation for: en/error'));
    });

    it('should handle JSON parse errors gracefully', () => {
      const localesDir = path.resolve(__dirname, '../../../../main/public/locales');
      const basePath = path.join(localesDir, 'en');

      mockedFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const file = filePath.toString();
        return file === localesDir || file.replace(/\\/g, '/').endsWith('/public/locales');
      });

      mockedFs.readFileSync.mockImplementation(filePath => {
        const file = filePath.toString();
        if (file === path.join(basePath, 'invalid.json')) {
          return 'invalid json';
        }
        throw new Error('Unexpected path');
      });

      const result = loadTranslations('en', ['invalid']);

      expect(result).toEqual({});
      expect(mockError).toHaveBeenCalled();
    });

    it('should merge translations from multiple files', () => {
      const localesDir = path.resolve(__dirname, '../../../../main/public/locales');
      const basePath = path.join(localesDir, 'en');

      mockedFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const file = filePath.toString();
        return file === localesDir || file.replace(/\\/g, '/').endsWith('/public/locales');
      });

      mockedFs.readFileSync.mockImplementation(filePath => {
        const file = filePath.toString();
        if (file === path.join(basePath, 'file1.json')) {
          return JSON.stringify({ key1: 'value1', key2: 'value2' });
        }
        if (file === path.join(basePath, 'file2.json')) {
          return JSON.stringify({ key3: 'value3' });
        }
        throw new Error('Unexpected path');
      });

      const result = loadTranslations('en', ['file1', 'file2']);

      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });
    });
  });

  describe('createGenerateContent', () => {
    beforeEach(() => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('{}');
    });

    it('should convert step name with hyphens to camelCase namespace', () => {
      const generateContent = createGenerateContent('enter-user-details', 'userJourney');
      generateContent('en');

      expect(mockedFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('enterUserDetails.json'), 'utf8');
    });

    it('should load common and step-specific translations', () => {
      const generateContent = createGenerateContent('test-step', 'folder');
      generateContent('en');

      expect(mockedFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('common.json'), 'utf8');
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('folder/testStep.json'), 'utf8');
    });

    it('should use default language "en" when not provided', () => {
      const generateContent = createGenerateContent('test-step', 'folder');
      generateContent();

      expect(mockedFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('en'), 'utf8');
    });

    it('should handle single word step name', () => {
      const generateContent = createGenerateContent('summary', 'userJourney');
      generateContent('en');

      expect(mockedFs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('summary.json'), 'utf8');
    });

    it('should handle multiple hyphens in step name', () => {
      const generateContent = createGenerateContent('enter-user-contact-details', 'folder');
      generateContent('en');

      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('enterUserContactDetails.json'),
        'utf8'
      );
    });
  });
});
