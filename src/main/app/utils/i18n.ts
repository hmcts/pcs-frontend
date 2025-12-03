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

function deepMerge(target: TranslationContent, source: TranslationContent): TranslationContent {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      // If both target and source have objects at this key, merge them recursively
      if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        result[key] = deepMerge(target[key] as TranslationContent, source[key] as TranslationContent);
      } else {
        // Otherwise, use the source value
        result[key] = source[key];
      }
    } else {
      // For primitives and arrays, source overrides target
      result[key] = source[key];
    }
  }

  return result;
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
      // Use deep merge to merge nested objects instead of replacing them
      Object.assign(translations, deepMerge(translations, parsed));
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

export function getNestedTranslation(translations: TranslationContent, key: string): string | undefined {
  const keys = key.split('.');
  let value: unknown = translations;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return typeof value === 'string' ? value : undefined;
}
