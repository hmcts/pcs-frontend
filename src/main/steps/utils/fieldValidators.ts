import { FilterXSS } from 'xss';

export const EMOJI_PATTERN = /\p{Emoji_Presentation}|\p{Extended_Pictographic}|\u200D|\uFE0F/u;

// --- Denylist approach (HDPI-5371) — commented out for xss spike; restore if denylist preferred ---
// export const UNSAFE_TEXT_PATTERNS: RegExp[] = [
//   /[<>]/,
//   /"/,
//   /javascript\s*:/i,
//   /\bon[a-z]+\s*=/i,
//   /\[[^\]]*\]\s*\(\s*javascript\s*:/i,
//   /\bvbscript\s*:/i,
// ];
//
// export function hasUnsafeTextContent(text: string): boolean {
//   return UNSAFE_TEXT_PATTERNS.some(pattern => pattern.test(text));
// }

const STRIP_HTML_OPTIONS = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'],
};

const htmlStripFilter = new FilterXSS(STRIP_HTML_OPTIONS);

// Only run xss when input looks like HTML; linear scan avoids CodeQL ReDoS on /\s*<.../ patterns.
export function looksLikeHtml(text: string): boolean {
  for (let i = 0; (i = text.indexOf('<', i)) !== -1; i++) {
    let j = i + 1;
    while (j < text.length && ' \t\n\r'.includes(text[j])) {j++;}
    if (text[j] === '/') {
      j++;
      while (j < text.length && ' \t\n\r'.includes(text[j])) {j++;}
    }
    const c = text[j];
    if (c && ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '!' || c === '/')) {
      return true;
    }
  }
  return false;
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
