import { linkify } from '../../../../../main/modules/nunjucks/filters/linkify';

describe('linkify filter', () => {
  it('should replace <link>...</link> with anchor tag', () => {
    const text = 'You should <link>view the claim</link> to continue.';
    const result = linkify(text, 'https://example.com/claim');
    const html = String(result);

    expect(html).toContain('You should ');
    expect(html).toContain('<a href="https://example.com/claim"');
    expect(html).toContain('class="govuk-link"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('>view the claim</a>');
    expect(html).toContain(' to continue.');
  });

  it('should use default className, target and rel when not provided', () => {
    const text = 'Click <link>here</link>.';
    const result = linkify(text, 'https://example.com');
    const html = String(result);

    expect(html).toBe(
      'Click <a href="https://example.com" class="govuk-link" target="_blank" rel="noopener noreferrer">here</a>.'
    );
  });

  it('should use custom options when provided', () => {
    const text = '<link>Custom link</link>';
    const result = linkify(text, 'https://example.com', {
      className: 'custom-class',
      target: '_self',
      rel: 'nofollow',
    });
    const html = String(result);

    expect(html).toContain('class="custom-class"');
    expect(html).toContain('target="_self"');
    expect(html).toContain('rel="nofollow"');
  });

  it('should handle text with no link placeholder', () => {
    const text = 'No link here.';
    const result = linkify(text, 'https://example.com');
    const html = String(result);

    expect(html).toBe('No link here.');
  });

  it('should handle only opening tag (incomplete placeholder)', () => {
    const text = 'Broken <link>link';
    const result = linkify(text, 'https://example.com');
    const html = String(result);

    expect(html).toContain('<a href="https://example.com"');
    expect(html).toContain('>link');
    expect(html).not.toContain('</link>');
  });

  it('should handle empty string', () => {
    const result = linkify('', 'https://example.com');
    const html = String(result);

    expect(html).toBe('');
  });

  it('should return SafeString (not escaped when rendered)', () => {
    const text = '<link>link</link>';
    const result = linkify(text, 'https://example.com');

    // Result should be a SafeString-like object (has __toString or similar)
    // When coerced to string, we get the raw HTML
    expect(String(result)).toContain('<a href="');
    expect(typeof result).not.toBe('undefined');
  });
});
