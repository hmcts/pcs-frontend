import type { Request } from 'express';

export function getValidatedLanguage(req: Request): string {
  const langParam = req.query?.lang;

  let langValue: string | undefined;
  if (typeof langParam === 'string') {
    langValue = langParam;
  } else if (Array.isArray(langParam) && langParam.length > 0 && typeof langParam[0] === 'string') {
    langValue = langParam[0];
  }

  return langValue === 'cy' ? 'cy' : 'en'; // Default to 'en' for any other value can only be 'cy' or 'en' per requirements
}
