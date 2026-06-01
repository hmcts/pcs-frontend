import { looksLikeHtml, stripHtmlTags } from '../../../../main/steps/utils/fieldValidators';

// --- Denylist approach (HDPI-5371) — commented out for xss spike; restore if denylist preferred ---
// import { hasUnsafeTextContent } from '../../../../main/steps/utils/fieldValidators';
//
// describe('hasUnsafeTextContent', () => {
//   describe('unsafe payloads', () => {
//     it.each([
//       ['" onfocus="alert(1)', 'attribute injection with event handler'],
//       ['[click](javascript:alert(1))', 'markdown javascript link'],
//       ["<script>alert('x')</script>", 'script tag'],
//       ['<img src=x>', 'unclosed img tag with angle bracket'],
//       ['javascript:alert(1)', 'javascript URL scheme'],
//       ['onclick=alert(1)', 'event handler without quotes'],
//       ['vbscript:msgbox(1)', 'vbscript URL scheme'],
//     ])('returns true for %s (%s)', input => {
//       expect(hasUnsafeTextContent(input)).toBe(true);
//     });
//   });
//
//   describe('safe payloads', () => {
//     it.each([
//       ['Assured shorthold', 'free text'],
//       ["O'Brien", 'name with apostrophe'],
//       ['07123456789', 'phone number'],
//       ['user@example.com', 'email address'],
//       ['1234.56', 'currency amount'],
//       ['SW1A 1AA', 'postcode'],
//     ])('returns false for %s (%s)', input => {
//       expect(hasUnsafeTextContent(input)).toBe(false);
//     });
//   });
// });

describe('looksLikeHtml', () => {
  it('returns false for comparison text with many spaces after <', () => {
    expect(looksLikeHtml(`1 bedroom is <${' '.repeat(5000)}2 bedrooms`)).toBe(false);
  });

  it('returns true for spaced tag-like markup', () => {
    expect(looksLikeHtml('< script>alert(1)</script>')).toBe(true);
  });
});

describe('stripHtmlTags', () => {
  it('strips tags per jsxss no-tag example', () => {
    const input = '<strong>hello</strong><script>alert(/xss/);</script>end';
    expect(stripHtmlTags(input)).toBe('helloend');
  });

  describe('unchanged plain text', () => {
    it.each([
      ['Assured shorthold', 'free text'],
      ["O'Brien", 'name with apostrophe'],
      ['07123456789', 'phone number'],
      ['user@example.com', 'email address'],
      ['1234.56', 'currency amount'],
      ['SW1A 1AA', 'postcode'],
      ['1 bedroom is < 2 bedrooms', 'less-than comparison'],
      ['1 bedroom > 2 bedrooms', 'greater-than comparison'],
      ['Bedroom 1 < 2 (smaller room)', 'comparison with parenthetical'],
    ])('returns %s unchanged (%s)', input => {
      expect(stripHtmlTags(input)).toBe(input);
    });
  });

  it('strips script tags when input looks like HTML', () => {
    const input = '<script>alert(1)</script>hello';
    expect(stripHtmlTags(input)).toBe('hello');
  });

  it('strips non-script HTML tags', () => {
    expect(stripHtmlTags('<strong>x</strong>')).toBe('x');
  });

  it('leaves plain-text XSS-style attribute injection unchanged (spike gap)', () => {
    const input = '" onfocus="alert(1)';
    expect(stripHtmlTags(input)).toBe(input);
  });
});
