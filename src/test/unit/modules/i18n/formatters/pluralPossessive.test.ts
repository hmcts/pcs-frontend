/* eslint-disable @typescript-eslint/no-explicit-any */
import type i18next from 'i18next';

import { pluralPossessive } from '../../../../../main/modules/i18n/formatters/pluralPossessive';

describe('pluralPossessive formatter', () => {
  let mockAdd: jest.Mock;
  let mockFormatter: { add: jest.Mock };
  let mockServices: { formatter?: { add: jest.Mock } };
  let mockI18n: typeof i18next;

  beforeEach(() => {
    mockAdd = jest.fn();
    mockFormatter = { add: mockAdd };
    mockServices = { formatter: mockFormatter };
    mockI18n = {
      services: mockServices,
    } as unknown as typeof i18next;
  });

  it('should register the pluralPossessive formatter', () => {
    pluralPossessive(mockI18n);

    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith('pluralPossessive', expect.any(Function));
  });

  describe('English language (en)', () => {
    let formatterFn: (value: string, lng: string | undefined, options: { format?: string }) => string;

    beforeEach(() => {
      pluralPossessive(mockI18n);
      formatterFn = mockAdd.mock.calls[0][1];
    });

    it('should add apostrophe only for words ending with s', () => {
      const result = formatterFn('James', 'en', {});
      expect(result).toBe('James’');
    });

    it('should add apostrophe and s for words not ending with s', () => {
      const result = formatterFn('John', 'en', {});
      expect(result).toBe('John’s');
    });

    it('should handle empty string', () => {
      const result = formatterFn('', 'en', {});
      expect(result).toBe('’s');
    });

    it('should handle single character s', () => {
      const result = formatterFn('s', 'en', {});
      expect(result).toBe('s’');
    });

    it('should use custom format when provided', () => {
      const result = formatterFn('James', 'en', { format: '`' });
      expect(result).toBe('James`');
    });

    it('should use custom format for words not ending with s', () => {
      const result = formatterFn('John', 'en', { format: '`' });
      expect(result).toBe('John`s');
    });

    it('should default to apostrophe when format is not provided', () => {
      const result = formatterFn('James', 'en', {});
      expect(result).toBe('James’');
    });

    it('should throw when options is undefined', () => {
      expect(() => formatterFn('James', 'en', undefined as any)).toThrow();
    });

    it('should default to apostrophe when format is empty string', () => {
      const result = formatterFn('James', 'en', { format: '' });
      expect(result).toBe('James’');
    });
  });

  describe('non-English languages', () => {
    let formatterFn: (value: string, lng: string | undefined, options: { format?: string }) => string;

    beforeEach(() => {
      pluralPossessive(mockI18n);
      formatterFn = mockAdd.mock.calls[0][1];
    });

    it('should return value as-is for Welsh (cy)', () => {
      const result = formatterFn('James', 'cy', {});
      expect(result).toBe('James');
    });

    it('should return value as-is for French (fr)', () => {
      const result = formatterFn('Jean', 'fr', {});
      expect(result).toBe('Jean');
    });

    it('should return value as-is when language is undefined', () => {
      const result = formatterFn('Test', undefined, {});
      expect(result).toBe('Test');
    });

    it('should return value as-is for empty language string', () => {
      const result = formatterFn('Test', '', {});
      expect(result).toBe('Test');
    });
  });

  describe('edge cases', () => {
    let formatterFn: (value: string, lng: string | undefined, options: { format?: string }) => string;

    beforeEach(() => {
      pluralPossessive(mockI18n);
      formatterFn = mockAdd.mock.calls[0][1];
    });

    it('should handle words with multiple s characters', () => {
      const result = formatterFn('assess', 'en', {});
      expect(result).toBe('assess’');
    });

    it('should add apostrophe and s for words ending with uppercase S (case-sensitive)', () => {
      const result = formatterFn('JAMES', 'en', {});
      expect(result).toBe('JAMES’s');
    });

    it('should handle mixed case words ending with s', () => {
      const result = formatterFn('James', 'en', {});
      expect(result).toBe('James’');
    });
  });

  describe('when i18n.services.formatter is undefined', () => {
    it('should not throw when services is undefined', () => {
      const i18nWithoutServices = {} as unknown as typeof i18next;
      expect(() => pluralPossessive(i18nWithoutServices)).not.toThrow();
    });

    it('should not throw when formatter is undefined', () => {
      const i18nWithoutFormatter = {
        services: {},
      } as unknown as typeof i18next;
      expect(() => pluralPossessive(i18nWithoutFormatter)).not.toThrow();
    });
  });
});
