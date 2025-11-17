import type { Request } from 'express';

export type SupportedLang = 'en' | 'cy';

/**
 * Get language from request using i18next-http-middleware
 * Falls back to 'en' if not available
 */
export function getLanguageFromRequest(req: Request): SupportedLang {
  const lang = (req as Request & { language?: string }).language;

  if (lang === 'en' || lang === 'cy') {
    return lang;
  }

  return 'en';
}
