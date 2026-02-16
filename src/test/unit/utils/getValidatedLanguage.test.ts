import type { Request } from 'express';
import type { ParsedQs } from 'qs';

import { getValidatedLanguage } from '../../../main/modules/steps';

describe('getValidatedLanguage', () => {
  function createMockRequest(lang: unknown): Partial<Request> {
    return {
      query: { lang } as ParsedQs,
    };
  }

  describe('string input', () => {
    it('should return "cy" when lang is "cy"', () => {
      const req = createMockRequest('cy');
      expect(getValidatedLanguage(req as Request)).toBe('cy');
    });

    it('should return "en" when lang is "en"', () => {
      const req = createMockRequest('en');
      expect(getValidatedLanguage(req as Request)).toBe('en');
    });

    it('should return "en" for any other string value', () => {
      expect(getValidatedLanguage(createMockRequest('fr') as Request)).toBe('en');
      expect(getValidatedLanguage(createMockRequest('de') as Request)).toBe('en');
      expect(getValidatedLanguage(createMockRequest('FR') as Request)).toBe('en');
      expect(getValidatedLanguage(createMockRequest('') as Request)).toBe('en');
      expect(getValidatedLanguage(createMockRequest('fr ') as Request)).toBe('en');
    });
  });

  describe('array input', () => {
    it('should use first element when it is "cy"', () => {
      const req = createMockRequest(['cy', 'en']);
      expect(getValidatedLanguage(req as Request)).toBe('cy');
    });

    it('should use first element when it is "en"', () => {
      const req = createMockRequest(['en', 'cy']);
      expect(getValidatedLanguage(req as Request)).toBe('en');
    });

    it('should return "en" when first element is not "cy"', () => {
      expect(getValidatedLanguage(createMockRequest(['fr', 'cy']) as Request)).toBe('en');
      expect(getValidatedLanguage(createMockRequest(['de']) as Request)).toBe('en');
    });

    it('should return "en" for empty array', () => {
      const req = createMockRequest([]);
      expect(getValidatedLanguage(req as Request)).toBe('en');
    });

    it('should handle non-string array elements', () => {
      expect(getValidatedLanguage(createMockRequest([123, 'cy']) as Request)).toBe('en');
      expect(getValidatedLanguage(createMockRequest([null, 'cy']) as Request)).toBe('en');
      expect(getValidatedLanguage(createMockRequest([{}, 'cy']) as Request)).toBe('en');
      expect(getValidatedLanguage(createMockRequest([undefined, 'cy']) as Request)).toBe('en');
    });

    it('should handle nested arrays', () => {
      const req = createMockRequest([['cy'], 'en']);
      expect(getValidatedLanguage(req as Request)).toBe('en');
    });
  });

  describe('normalization', () => {
    it('lowercases and trims', () => {
      expect(getValidatedLanguage(createMockRequest('CY') as Request)).toBe('cy');
      expect(getValidatedLanguage(createMockRequest(' cy  ') as Request)).toBe('cy');
      expect(getValidatedLanguage(createMockRequest(' EN ') as Request)).toBe('en');
    });
  });

  describe('other input types', () => {
    it('should return "en" when lang is undefined', () => {
      const req = { query: {} } as unknown as Request;
      expect(getValidatedLanguage(req)).toBe('en');
    });

    it('should return "en" when lang is null', () => {
      const req = createMockRequest(null);
      expect(getValidatedLanguage(req as Request)).toBe('en');
    });

    it('should return "en" when lang is a number', () => {
      expect(getValidatedLanguage(createMockRequest(123) as Request)).toBe('en');
      expect(getValidatedLanguage(createMockRequest(0) as Request)).toBe('en');
    });

    it('should return "en" when lang is a boolean', () => {
      expect(getValidatedLanguage(createMockRequest(true) as Request)).toBe('en');
      expect(getValidatedLanguage(createMockRequest(false) as Request)).toBe('en');
    });

    it('should return "en" when lang is an object', () => {
      expect(getValidatedLanguage(createMockRequest({}) as Request)).toBe('en');
      expect(getValidatedLanguage(createMockRequest({ value: 'cy' }) as Request)).toBe('en');
    });

    it('should handle ParsedQs objects', () => {
      const parsedQs = {
        toString: () => '[object Object]',
        value: 'cy',
      };
      expect(getValidatedLanguage(createMockRequest(parsedQs) as Request)).toBe('en');
    });
  });

  describe('edge cases', () => {
    it('should handle query without lang parameter', () => {
      const req = { query: { other: 'value' } } as unknown as Request;
      expect(getValidatedLanguage(req)).toBe('en');
    });

    it('should handle missing query object', () => {
      const req = {} as unknown as Request;
      expect(getValidatedLanguage(req)).toBe('en');
    });

    it('should handle array with mixed valid and invalid values', () => {
      expect(getValidatedLanguage(createMockRequest(['en', 'invalid', 'cy']) as Request)).toBe('en');
      expect(getValidatedLanguage(createMockRequest(['invalid', 'cy']) as Request)).toBe('en');
    });
  });
});
