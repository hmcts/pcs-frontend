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

function isRichText(text: string | null | undefined): text is string {
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
