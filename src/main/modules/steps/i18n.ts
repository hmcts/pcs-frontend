import { promises as fs } from 'fs';
import path from 'path';

import type { Request } from 'express';
import type { TFunction } from 'i18next';

import { getUserType } from '../../steps/utils';
import {
  type AllowedLang,
  findLocalesDir,
  getRequestLanguage as getMainRequestLanguage,
  getTranslationFunction as getMainTranslationFunction,
} from '../i18n';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('i18n');

export type TranslationContent = Record<string, unknown>;

export type SupportedLang = AllowedLang;

const isDevelopment = process.env.NODE_ENV !== 'production';

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function mergeTranslations(
  baseTranslations: Record<string, unknown>,
  overrideTranslations: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...baseTranslations };

  for (const [key, value] of Object.entries(overrideTranslations)) {
    const existingValue = merged[key];

    if (isObject(existingValue) && isObject(value)) {
      merged[key] = mergeTranslations(existingValue, value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
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

function buildStepNamespace(stepName: string, folder: string, userType: string): string {
  return userType === 'citizen'
    ? getStepTranslationPath(stepName, folder)
    : `${folder}/${userType}/${getStepNamespace(stepName)}`;
}

function getStepTranslationPaths(stepName: string, folder: string, userType: string): string[] {
  const defaultPath = getStepTranslationPath(stepName, folder);

  if (userType === 'citizen') {
    return [defaultPath];
  }

  return [defaultPath, `${folder}/${userType}/${getStepNamespace(stepName)}`];
}

export async function loadStepNamespace(req: Request, stepName: string, folder: string): Promise<void> {
  if (!req.i18n) {
    return;
  }

  const userType = getUserType(req);
  const stepNamespace = buildStepNamespace(stepName, folder, userType);
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

  try {
    let translations: Record<string, unknown> = {};

    for (const translationPath of getStepTranslationPaths(stepName, folder, userType)) {
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
        translations = mergeTranslations(translations, JSON.parse(fileContent) as Record<string, unknown>);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('ENOENT')) {
          throw error;
        }
      }
    }

    if (Object.keys(translations).length === 0) {
      return;
    }

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

export function getStepTranslations(req: Request, stepName: string, folder: string): TranslationContent {
  if (!req.i18n) {
    return {};
  }

  const userType = getUserType(req);
  const lang = getMainRequestLanguage(req);
  const resources = req.i18n.getResourceBundle(lang, buildStepNamespace(stepName, folder, userType));
  return (resources as TranslationContent) || {};
}

export function getTranslationFunction(
  req: Request,
  stepName?: string,
  namespaces: string[] = ['common'],
  journeyFolder?: string
): TFunction {
  if (!req.i18n) {
    return getMainTranslationFunction(req, namespaces);
  }

  const lang = getMainRequestLanguage(req);
  if (!stepName) {
    const fixedT = req.i18n.getFixedT(lang, namespaces);
    return fixedT || getMainTranslationFunction(req, namespaces);
  }

  const folder = journeyFolder || req.res?.locals?.step?.journey;
  if (typeof folder === 'string' && folder.length > 0) {
    const userType = getUserType(req);
    const fixedT = req.i18n.getFixedT(lang, [buildStepNamespace(stepName, folder, userType), ...namespaces]);
    return fixedT || getMainTranslationFunction(req, namespaces);
  }

  return getMainTranslationFunction(req, namespaces);
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
