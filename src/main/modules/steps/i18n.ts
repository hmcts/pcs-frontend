import { promises as fs } from 'fs';
import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

const logger = Logger.getLogger('i18n');

export type SupportedLang = 'en' | 'cy';
export type TranslationContent = Record<string, unknown>;

const LANG_MAP: Record<string, SupportedLang> = { en: 'en', cy: 'cy' };
const isDevelopment = process.env.NODE_ENV !== 'production';

async function findLocalesDir(): Promise<string | null> {
  const candidates = [
    process.env.LOCALES_DIR || '',
    path.resolve(__dirname, '../../public/locales'),
    path.resolve(__dirname, '../../../public/locales'),
    path.resolve(process.cwd(), 'src/main/public/locales'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

export function getStepNamespace(stepName: string): string {
  return stepName
    .split('-')
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

export function getStepTranslationPath(stepName: string, folder: string): string {
  return `${folder}/${getStepNamespace(stepName)}`;
}

export async function loadStepNamespace(req: Request, stepName: string, folder: string): Promise<void> {
  if (!req.i18n) {
    return;
  }

  const stepNamespace = getStepNamespace(stepName);
  const lang = getRequestLanguage(req);

  if (req.i18n.getResourceBundle(lang, stepNamespace)) {
    return;
  }

  const localesDir = await findLocalesDir();
  if (!localesDir) {
    if (isDevelopment) {
      logger.warn(`Locales directory not found. Translation file for ${stepName} will not be loaded.`);
    }
    return;
  }

  try {
    const translationPath = getStepTranslationPath(stepName, folder);
    const filePath = path.join(localesDir, lang, `${translationPath}.json`);

    try {
      await fs.access(filePath);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const translations = JSON.parse(fileContent);
      req.i18n.addResourceBundle(lang, stepNamespace, translations, true, true);

      await new Promise<void>((resolve, reject) => {
        req.i18n!.loadNamespaces(stepNamespace, err => (err ? reject(err) : resolve()));
      });
    } catch {
      if (isDevelopment) {
        logger.warn(`Translation file not found: ${filePath}`);
      }
    }
  } catch (error) {
    logger.error(`Failed to load translation file for ${stepName}:`, error);
  }
}

export function getStepTranslations(req: Request, stepName: string): TranslationContent {
  if (!req.i18n) {
    return {};
  }

  const lang = getRequestLanguage(req);
  const resources = req.i18n.getResourceBundle(lang, getStepNamespace(stepName));
  return (resources as TranslationContent) || {};
}

export function getValidatedLanguage(req: Request): SupportedLang {
  const i18nLang = req.language;
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

/**
 * Gets the language from the request, falling back to validated language if not set
 */
export function getRequestLanguage(req: Request): SupportedLang {
  return (req.language as SupportedLang) || getValidatedLanguage(req);
}

/**
 * Gets the translation function for a request, with optional namespace support
 */
export function getTranslationFunction(req: Request, stepName?: string, namespaces: string[] = ['common']): TFunction {
  if (!req.i18n) {
    return ((key: string) => key) as TFunction;
  }

  const lang = getRequestLanguage(req);
  const allNamespaces = stepName ? [getStepNamespace(stepName), ...namespaces] : namespaces;
  return req.i18n.getFixedT(lang, allNamespaces) || (req.t as TFunction) || ((key: string) => key);
}

/**
 * Validates and warns about missing translation keys in development mode
 */
export function validateTranslationKey(t: TFunction, key: string, context?: string): void {
  if (isDevelopment) {
    const translation = t(key);
    if (translation === key) {
      logger.warn(`Missing translation key: "${key}"${context ? ` in ${context}` : ''}`);
    }
  }
}
