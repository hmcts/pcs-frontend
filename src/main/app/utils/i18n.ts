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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lang = (req as any).language || 'en';

  if (req.i18n.getResourceBundle(lang, stepNamespace)) {
    return;
  }

  const localesDir = findLocalesDir();
  if (!localesDir) {
    return;
  }

  try {
    const translationPath = getStepTranslationPath(stepName, folder);
    const filePath = path.join(localesDir, lang, `${translationPath}.json`);

    if (fs.existsSync(filePath)) {
      const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      req.i18n.addResourceBundle(lang, stepNamespace, translations, true, true);

      await new Promise<void>((resolve, reject) => {
        req.i18n!.loadNamespaces(stepNamespace, err => (err ? reject(err) : resolve()));
      });
    } else {
      logger.warn(`Translation file not found: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Failed to load translation file for ${stepName}:`, error);
  }
}

export function getStepTranslations(req: Request, stepName: string): TranslationContent {
  if (!req.i18n) {
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lang = (req as any).language || 'en';
  const resources = req.i18n.getResourceBundle(lang, getStepNamespace(stepName));
  return (resources as TranslationContent) || {};
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
