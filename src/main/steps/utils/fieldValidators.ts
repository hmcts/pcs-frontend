export const EMOJI_PATTERN = /\p{Emoji_Presentation}|\p{Extended_Pictographic}|\u200D|\uFE0F/u;

export const UNSAFE_TEXT_PATTERNS: RegExp[] = [
  /[<>]/,
  /"/,
  /javascript\s*:/i,
  /\bon[a-z]+\s*=/i,
  /\[[^\]]*\]\s*\(\s*javascript\s*:/i,
  /\bvbscript\s*:/i,
];

export function hasUnsafeTextContent(text: string): boolean {
  return UNSAFE_TEXT_PATTERNS.some(pattern => pattern.test(text));
}

export const noEmojiValidator =
  (errorKey: string) =>
  (value: unknown): boolean | string => {
    if (typeof value !== 'string' || !value.trim()) {
      return true;
    }
    return !EMOJI_PATTERN.test(value) || errorKey;
  };
