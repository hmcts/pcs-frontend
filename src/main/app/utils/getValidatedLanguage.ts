import type { Request } from 'express';

export type SupportedLang = 'en' | 'cy';

const MAP: Record<string, SupportedLang> = { en: 'en', cy: 'cy' };

export function getValidatedLanguage(req: Request): SupportedLang {
  // First check req.language from i18n module (which reads from cookie/session)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const i18nLang = (req as any).language;
  if (i18nLang && MAP[i18nLang.toLowerCase()]) {
    return MAP[i18nLang.toLowerCase()];
  }

  // Fallback to query/body for explicit language changes
  const raw =
    (typeof req.query?.lang === 'string' && req.query.lang) ||
    (Array.isArray(req.query?.lang) && typeof req.query.lang[0] === 'string' && req.query.lang[0]) ||
    (typeof req.body?.lang === 'string' && req.body.lang) ||
    '';
  const normalized = raw.toLowerCase().trim();
  return MAP[normalized] ?? 'en';
}
