import { FilterXSS } from 'xss';

export const EMOJI_PATTERN = /\p{Emoji_Presentation}|\p{Extended_Pictographic}|\u200D|\uFE0F/u;

const STRIP_HTML_OPTIONS = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'],
  // Preserve stray '<' / '>' (e.g. "1 bed < 2 beds") instead of escaping them to &lt;/&gt;.
  escapeHtml: (str: string) => str,
};

const htmlStripFilter = new FilterXSS(STRIP_HTML_OPTIONS);

// Only run xss when input looks like HTML. Single-quantifier regex with disjoint
// character classes => strictly linear, no ReDoS risk for CodeQL to flag.
const HTML_LIKE_PATTERN = /<[\s/]*[A-Za-z!]/;

export function looksLikeHtml(text: string): boolean {
  return HTML_LIKE_PATTERN.test(text);
}

export function stripHtmlTags(text: string): string {
  if (!looksLikeHtml(text)) {
    return text;
  }
  return htmlStripFilter.process(text);
}

export const noEmojiValidator =
  (errorKey: string) =>
  (value: unknown): boolean | string => {
    if (typeof value !== 'string' || !value.trim()) {
      return true;
    }
    return !EMOJI_PATTERN.test(value) || errorKey;
  };
