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

/** Whether a numbered list is inside another, which the order numbers (i), (ii) whatever the applicant lettered it. */
function hasSubclauses(html: string): boolean {
  const lists: string[] = [];
  for (const [tag, name] of html.matchAll(/<\/?(ol|ul)\b/gi)) {
    if (tag.startsWith('</')) {
      lists.pop();
    } else if (name.toLowerCase() === 'ol' && lists[lists.length - 1] === 'ol') {
      return true;
    } else {
      lists.push(name.toLowerCase());
    }
  }
  return false;
}

/**
 * What of the applicant's formatting the order changes, for telling the judge before they use their wording:
 * it numbers subclauses (i), (ii), has bullets as lines starting "•", headings as bold text, and no underlining
 * or rules.
 */
export function richTextNotKept(text: string | null | undefined): string[] {
  if (!isRichText(text)) {
    return [];
  }
  const html = richTextHtml(text);
  return [
    hasSubclauses(html) ? 'subclauses are numbered (i), (ii) and so on' : '',
    /<ul\b/i.test(html) ? 'bullets become lines starting “•”' : '',
    /<h[1-6]\b/i.test(html) ? 'headings become bold text' : '',
    /<u\b/i.test(html) ? 'underlining is not kept' : '',
    /<hr\b/i.test(html) ? 'horizontal lines are not kept' : '',
  ].filter(Boolean);
}
