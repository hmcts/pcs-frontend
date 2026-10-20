import escapeHtml from 'escape-html';
import { FilterXSS } from 'xss';

/**
 * A RichTextArea answer from an XUI journey, which XUI always writes as HTML blocks, unlike the citizen journey's
 * plain text and answers given before the field was rich text.
 */
const RICH_TEXT = /^\s*<(?:p|ol|ul|h[1-6]|blockquote|br|hr)[\s/>]/i;

// The tags and list attributes a RichTextArea can hold (CCD's RichTextAreaValidator), without its styling.
const richTextFilter = new FilterXSS({
  whiteList: {
    b: [],
    blockquote: [],
    br: [],
    em: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    hr: [],
    i: [],
    li: ['value'],
    ol: ['start', 'type', 'data-indent'],
    p: [],
    strong: [],
    u: [],
    ul: ['data-indent'],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
});

export function isRichText(text: string | null | undefined): text is string {
  return RICH_TEXT.test(text ?? '');
}

/** An answer as safe HTML to show: rich text as the applicant formatted it, plain text as its lines. */
export function richTextHtml(text: string | null | undefined): string {
  if (!text) {
    return '';
  }
  if (isRichText(text)) {
    return richTextFilter.process(text);
  }
  return `<p>${escapeHtml(text).replace(/\r?\n/g, '<br>')}</p>`;
}

/** Whether a list is inside another, which the order numbers (i), (ii) whatever the applicant lettered it. */
function hasSubclauses(html: string): boolean {
  let depth = 0;
  for (const [tag] of html.matchAll(/<\/?(?:ol|ul)\b/gi)) {
    depth += tag.startsWith('</') ? -1 : 1;
    if (depth > 1) {
      return true;
    }
  }
  return false;
}

/**
 * What of the applicant's formatting an order cannot keep, for telling the judge before they use their wording:
 * the order numbers subclauses (i), (ii), and has no underlining or rules.
 */
export function richTextNotKept(text: string | null | undefined): string[] {
  if (!isRichText(text)) {
    return [];
  }
  return [
    hasSubclauses(text) ? 'subclauses are numbered (i), (ii) and so on' : '',
    /<u\b/i.test(text) ? 'underlining is not kept' : '',
    /<hr\b/i.test(text) ? 'horizontal lines are not kept' : '',
  ].filter(Boolean);
}
