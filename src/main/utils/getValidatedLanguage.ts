import type { Request } from 'express';

export type SupportedLang = 'en' | 'cy';

const MAP: Record<string, SupportedLang> = { en: 'en', cy: 'cy' };

export function getValidatedLanguage(req: Request): SupportedLang {
  const raw =
    (typeof req.query?.lang === 'string' && req.query.lang) ||
    (Array.isArray(req.query?.lang) && typeof req.query.lang[0] === 'string' && req.query.lang[0]) ||
    (typeof req.body?.lang === 'string' && req.body.lang) ||
    '';
  const normalized = raw.toLowerCase().trim();
  return MAP[normalized] ?? 'en';
}
