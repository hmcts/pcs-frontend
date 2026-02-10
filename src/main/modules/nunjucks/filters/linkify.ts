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

  return text.replace('<link>', open).replace('</link>', close);
}
