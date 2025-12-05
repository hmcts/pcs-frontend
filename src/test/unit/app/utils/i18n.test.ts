import type { Request } from 'express';

import { getValidatedLanguage } from '../../../../main/modules/steps';

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
});
