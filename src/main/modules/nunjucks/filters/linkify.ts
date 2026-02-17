import nunjucks from 'nunjucks';

const SafeString = (nunjucks as { runtime?: { SafeString: new (s: string) => unknown } }).runtime?.SafeString;
if (!SafeString) {
  throw new Error('Nunjucks SafeString not available');
}

export function linkify(
  text: string,
  href: string,
  options?: {
    className?: string;
    target?: string;
    rel?: string;
  }
): string {
  const { className = 'govuk-link', target = '_blank', rel = 'noopener noreferrer' } = options ?? {};

  const open = `<a href="${href}" class="${className}" target="${target}" rel="${rel}">`;
  const close = '</a>';

  const html = text.replace('<link>', open).replace('</link>', close);
  return new (SafeString as new (s: string) => unknown)(html) as unknown as string;
}
