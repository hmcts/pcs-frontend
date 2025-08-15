import type { Request } from 'express';

export function getValidatedLanguage(req: Request): string {
  const allowedLanguages = ['en', 'cy']; // Define allowed languages
  const langParam = req.query?.lang;

  let langValue: string | undefined;
  if (typeof langParam === 'string') {
    langValue = langParam;
  } else if (Array.isArray(langParam) && langParam.length > 0 && typeof langParam[0] === 'string') {
    langValue = langParam[0];
  }

  return langValue && allowedLanguages.includes(langValue) ? langValue : 'en';
}
