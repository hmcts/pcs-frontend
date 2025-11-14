import type { Request } from 'express';

export type SupportedLang = 'en' | 'cy';

const MAP: Record<string, SupportedLang> = { en: 'en', cy: 'cy' };

/**
 * @deprecated Use `getLanguageFromRequest` from '../utils/getLanguageFromRequest' instead.
 * This function manually parses query strings and body, while getLanguageFromRequest uses
 * i18next-http-middleware which automatically handles language detection from query string,
 * cookie, and session, with automatic cookie persistence.
 *
 * This function is kept for backward compatibility with existing tests.
 * New code should use `getLanguageFromRequest`.
 */
export function getValidatedLanguage(req: Request): SupportedLang {
  const raw =
    (typeof req.query?.lang === 'string' && req.query.lang) ||
    (Array.isArray(req.query?.lang) && typeof req.query.lang[0] === 'string' && req.query.lang[0]) ||
    (typeof req.body?.lang === 'string' && req.body.lang) ||
    '';
  const normalized = raw.toLowerCase().trim();
  return MAP[normalized] ?? 'en';
}
