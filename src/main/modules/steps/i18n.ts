import { promises as fs } from 'fs';
import path from 'path';

import { Logger } from '@hmcts/nodejs-logging';
import type { Request } from 'express';
import type { TFunction } from 'i18next';

import {
  type AllowedLang,
  findLocalesDir,
  getRequestLanguage as getMainRequestLanguage,
  getTranslationFunction as getMainTranslationFunction,
} from '../i18n';

const logger = Logger.getLogger('i18n');

export type TranslationContent = Record<string, unknown>;

export type SupportedLang = AllowedLang;

const isDevelopment = process.env.NODE_ENV !== 'production';

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
  const lang = getMainRequestLanguage(req);

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

  const translationPath = getStepTranslationPath(stepName, folder);
  const filePath = path.join(localesDir, lang, `${translationPath}.json`);

  const resolvedPath = path.resolve(filePath);
  const resolvedLocalesDir = path.resolve(localesDir);
  if (!resolvedPath.startsWith(resolvedLocalesDir)) {
    if (isDevelopment) {
      logger.warn(`Invalid translation path detected: ${translationPath}`);
    }
    return;
  }

  try {
    await fs.access(resolvedPath);
    const fileContent = await fs.readFile(resolvedPath, 'utf8');
    const translations = JSON.parse(fileContent);
    req.i18n.addResourceBundle(lang, stepNamespace, translations, true, true);

    await new Promise<void>((resolve, reject) => {
      req.i18n!.loadNamespaces(stepNamespace, err => (err ? reject(err) : resolve()));
    });
  } catch (error) {
    if (isDevelopment) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('ENOENT')) {
        logger.error(`Failed to load translation file for ${stepName}:`, error);
      }
    }
  }
}

export function getStepTranslations(req: Request, stepName: string): TranslationContent {
  if (!req.i18n) {
    return {};
  }

  const lang = getMainRequestLanguage(req);
  const resources = req.i18n.getResourceBundle(lang, getStepNamespace(stepName));
  return (resources as TranslationContent) || {};
}

/** Gets the translation function for a request with step namespace support. */
export function getTranslationFunction(req: Request, stepName?: string, namespaces: string[] = ['common']): TFunction {
  if (!req.i18n) {
    return getMainTranslationFunction(req, namespaces);
  }

  const lang = getMainRequestLanguage(req);
  const allNamespaces = stepName ? [getStepNamespace(stepName), ...namespaces] : namespaces;
  const fixedT = req.i18n.getFixedT(lang, allNamespaces);
  return fixedT || getMainTranslationFunction(req, namespaces);
}

/** Validates and warns about missing translation keys in development. */
export function validateTranslationKey(t: TFunction, key: string, context?: string): void {
  if (isDevelopment) {
    const translation = t(key);
    if (translation === key) {
      logger.warn(`Missing translation key: "${key}"${context ? ` in ${context}` : ''}`);
    }
  }
}
