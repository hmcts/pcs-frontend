import type { Request } from 'express';

export type SupportedLang = 'en' | 'cy';

/**
 * Get language from request using i18next-http-middleware
 * Falls back to 'en' if not available
 */
export function getLanguageFromRequest(req: Request): SupportedLang {
  // i18next-http-middleware sets req.language
  // Type assertion needed because Express Request doesn't have language by default
  const lang = (req as Request & { language?: string }).language;

  if (lang === 'en' || lang === 'cy') {
    return lang;
  }

  // Fallback to 'en' if language is not set or invalid
  return 'en';
}
