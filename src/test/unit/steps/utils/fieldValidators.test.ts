import { hasUnsafeTextContent } from '../../../../main/steps/utils/fieldValidators';

describe('hasUnsafeTextContent', () => {
  describe('unsafe payloads', () => {
    it.each([
      ['" onfocus="alert(1)', 'attribute injection with event handler'],
      ['[click](javascript:alert(1))', 'markdown javascript link'],
      ["<script>alert('x')</script>", 'script tag'],
      ['<img src=x>', 'unclosed img tag with angle bracket'],
      ['javascript:alert(1)', 'javascript URL scheme'],
      ['onclick=alert(1)', 'event handler without quotes'],
      ['vbscript:msgbox(1)', 'vbscript URL scheme'],
    ])('returns true for %s (%s)', (input) => {
      expect(hasUnsafeTextContent(input)).toBe(true);
    });
  });

  describe('safe payloads', () => {
    it.each([
      ['Assured shorthold', 'free text'],
      ["O'Brien", 'name with apostrophe'],
      ['07123456789', 'phone number'],
      ['user@example.com', 'email address'],
      ['1234.56', 'currency amount'],
      ['SW1A 1AA', 'postcode'],
    ])('returns false for %s (%s)', (input) => {
      expect(hasUnsafeTextContent(input)).toBe(false);
    });
  });
});
