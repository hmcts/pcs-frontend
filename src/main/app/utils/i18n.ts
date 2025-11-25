import fs from 'fs';
import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import type { Request } from 'express';

const logger = Logger.getLogger('i18n');

export type SupportedLang = 'en' | 'cy';
export type TranslationContent = Record<string, unknown>;

const LANG_MAP: Record<string, SupportedLang> = { en: 'en', cy: 'cy' };

function findLocalesDir(): string | null {
  const candidates = [
    process.env.LOCALES_DIR || '',
    path.resolve(__dirname, '../../public/locales'),
    path.resolve(__dirname, '../../../public/locales'),
    path.resolve(process.cwd(), 'src/main/public/locales'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function getValidatedLanguage(req: Request): SupportedLang {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const i18nLang = (req as any).language;
  if (i18nLang && LANG_MAP[i18nLang.toLowerCase()]) {
    return LANG_MAP[i18nLang.toLowerCase()];
  }

  const raw =
    (typeof req.query?.lang === 'string' && req.query.lang) ||
    (Array.isArray(req.query?.lang) && typeof req.query.lang[0] === 'string' && req.query.lang[0]) ||
    (typeof req.body?.lang === 'string' && req.body.lang) ||
    '';
  const normalized = raw.toLowerCase().trim();
  return LANG_MAP[normalized] ?? 'en';
}

export function loadTranslations(lang: string, namespaces: string[]): TranslationContent {
  const translations: TranslationContent = {};
  const localesDir = findLocalesDir();

  if (!localesDir) {
    logger.error('No locales directory found. Translations will be empty.');
    return translations;
  }

  const basePath = path.join(localesDir, lang);

  for (const ns of namespaces) {
    try {
      const filePath = path.join(basePath, `${ns}.json`);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(fileContent);
      Object.assign(translations, parsed);
    } catch (error) {
      logger.error(`Failed to load translation for: ${lang}/${ns} with error ${error}`);
    }
  }

  return translations;
}

export function createGenerateContent(stepName: string, folder: string) {
  const namespace = stepName
    .split('-')
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');

  return (lang: SupportedLang = 'en'): TranslationContent => {
    return loadTranslations(lang, ['common', `${folder}/${namespace}`]);
  };
}
